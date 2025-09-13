import { jsTPS } from '../jstps/index.js'
import Playlist from "./Playlist.js";
import PlaylistSongPrototype from './PlaylistSongPrototype.js';
import CreateSong_Transaction from "./transactions/CreateSong_Transaction.js";
import MoveSong_Transaction from "./transactions/MoveSong_Transaction.js";
import RemoveSong_Transaction from "./transactions/RemoveSong_Transaction.js";
import PlaylistBuilder from './PlaylistBuilder.js';
import UpdateSong_Transaction from "./transactions/UpdateSong_Transaction.js";

/**
 * PlaylisterModel.js
 * 
 * This class manages all playlist data for updating and accessing songs
 * as well as for loading and unloading lists. Note that editing should employ
 * an undo/redo mechanism for any editing features that change a loaded list
 * should employ transactions the jsTPS.
 * 
 * Note that we are employing a Model-View-Controller (MVC) design strategy
 * here so that when data in this class changes it is immediately reflected
 * inside the view of the page.
 * 
 * @author McKilla Gorilla
 */
export default class PlaylisterModel {
    /**
     * The constructor initializes all the application data for use such that
     * it is ready to be loaded with playlist data from a file.
     */
    constructor() {
        // THIS WILL STORE ALL OF OUR LISTS
        this.playlists = [];

        // THIS IS THE LIST CURRENTLY BEING EDITED
        this.currentList = null;

        // THIS WILL MANAGE OUR TRANSACTIONS
        this.tps = new jsTPS();

        // THE MODAL IS NOT CURRENTLY OPEN
        this.confirmDialogOpen = false;

        // PREVENTS LOADING THE WRONG LIST NAME IN THE STATUS BAR
        this.listNameBeingChanged = false;
    }
    addTransactionToUpdateSong(index, newData) {
        // push transaction
        const old = this.getSong(index);
        const oldSnapshot = { title: old.title, artist: old.artist, youTubeId: old.youTubeId, year: old.year };
        const tx = new UpdateSong_Transaction(this, index, oldSnapshot, newData);
        this.tps.processTransaction(tx);
        this.view.updateToolbarButtons(this.hasCurrentList(),
            this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
    }

    updateSong(index, newData) {
        const s = this.currentList.songs[index]; // direct access is fine in this codebase
        if (!s) return;

        if (typeof newData.title === 'string') s.title = newData.title;
        if (typeof newData.artist === 'string') s.artist = newData.artist;
        if (typeof newData.youTubeId === 'string') s.youTubeId = newData.youTubeId;

        // allow clearing year when field is blank
        if ('year' in newData) {
            s.year = (newData.year === undefined || newData.year === null || Number.isNaN(newData.year))
                ? undefined
                : Number(newData.year);
        }

        this.view.refreshSongCards(this.currentList);
        this.saveLists();
    }


    /**
     * Adds an initialized list, which could be a brand new list or one loaded from a file. Once
     * added the view will be notified such that it is rendered in the UI. Note, it will be added
     * in sorted order by name.
     * 
     * @param {Playlist} listToAdd List to add such that the user may view or edit it.
     * @return {Playlist} The list that was added.
     */
    addList(listToAdd) {
        this.playlists.push(listToAdd);
        this.sortLists();
        this.view.refreshPlaylistCards(this.playlists);
        return listToAdd;
    }

    /**
     * Creates and adds a new list, assigning it a unique id number.
     * 
     * @param {string} initName Name of the list to add.
     * @param {string} initSongs Songs in the playlist to add.
     * @return {Playlist} The list that was added.
     */
    addNewList(initName, initSongs) {
        // GET THE BUILDER SINGLETON
        let playlistBuilder = PlaylistBuilder.getSingleton();
        let newList = playlistBuilder.buildPlaylist(initName, initSongs);
        return this.addList(newList);
    }

    // Create a unique "(Copy)" name: "List (Copy)", "List (Copy 2)", "List (Copy 3)", ...
    _generateCopyName(baseName) {
        let candidate = `${baseName} (Copy)`;
        let i = 2;
        while (this.hasPlaylistWithName(candidate)) {
            candidate = `${baseName} (Copy ${i})`;
            i++;
        }
        return candidate;
    }

    duplicateList(sourceId) {
        const source = this.getPlaylist(sourceId);
        if (!source) return null;

        const currentName = source.getName ? source.getName() : source.name;
        const newName = this._generateCopyName(currentName);

        // Deep-copy songs (match loadLists: title, artist, youTubeId)
        const clonedSongs = (source.songs || []).map(s =>
            new PlaylistSongPrototype(
                s.title ?? s.getTitle?.(),
                s.artist ?? s.getArtist?.(),
                s.youTubeId ?? s.getYouTubeId?.()
            )
        );

        // Add (sorted) and return the new list
        const newList = this.addNewList(newName, clonedSongs);
        return newList;
    }


    /**
     * Adds an undoable transaction for creating a song to the transaction stack.
     */
    addTransactionToCreateSong() {
        // ADD A SONG
        let song = new PlaylistSongPrototype("Untitled", "???", 2000, "dQw4w9WgXcQ");
        let appendIndex = this.getPlaylistSize();
        let transaction = new CreateSong_Transaction(this, appendIndex, song);
        this.tps.processTransaction(transaction);
        this.view.updateToolbarButtons(this.hasCurrentList(),
            this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
    }

    /**
     * Adds an undoable transaction for moving a song to the transaction stack.
     *
     * @param {number} fromIndex The source index for moving the song
     * @param {number} onIndex The destination index for moving the song
     */
    addTransactionToMoveSong(fromIndex, onIndex) {
        let transaction = new MoveSong_Transaction(this, fromIndex, onIndex);
        this.tps.processTransaction(transaction);
        this.view.updateToolbarButtons(this.hasCurrentList(),
            this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
    }

    /**
     * Adds an undoable transaction for removing a song to the transaction stack.
     * 
     * @param {number} index The index of the transaction to remove
     */
    addTransactionToRemoveSong(index) {
        let song = this.getSong(index);
        let transaction = new RemoveSong_Transaction(this, index, song);
        this.tps.processTransaction(transaction);
        this.view.updateToolbarButtons(this.hasCurrentList(),
            this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
    }

    /**
     * Inserts the song argument into the playlist at index. Note, after being placed
     * this will rerendering the user interface to reflect the new song and will also
     * save the changes to local storage.
     * 
     * @param {number} index The location in the playlist to place the song
     * @param {PlaylistSongPrototype} song The song to place in the playlist
     */
    createSong(index, song) {
        this.currentList.songs.splice(index, 0, song);
        this.view.refreshSongCards(this.currentList);
        this.saveLists();
    }

    /**
     * Deletes the list with the provided id and updates the UI to reflect the change.
     * 
     * @param {number} id The id of the list to delete.
     */
    deleteList(id) {
        let toBeDeleted = this.playlists[this.getListIndex(id)];
        this.playlists = this.playlists.filter(list => list.id !== id);
        this.view.refreshPlaylistCards(this.playlists)
        if (toBeDeleted == this.currentList) {
            this.currentList = null;
            this.view.clearWorkspace();
            this.tps.clearAllTransactions();
            this.view.updateStatusBar(false);
        } else if (this.hasCurrentList()) {
            this.view.highlightList(this.currentList.id);
        }
        this.saveLists();
    }

    /**
     * Accessor method for getting the index of the song being edited. This represents
     * the song edited via a modal.
     */
    getEditSongIndex() {
        return this.editSongIndex;
    }

    /**
     * Accessor method for getting the playlist at index
     * 
     * @param {number} index The numeric index of the playlist to retrieve
     */
    getList(index) {
        return this.playlists[index];
    }

    /**
     * Accessor method for getting the index of the list to delete. This is used
     * during the modal verification.
     * 
     * @return {number} The id of the list being deleted.
     */
    getDeleteListId() {
        return this.deleteListId;
    }

    /**
     * Accessor method for getting the index of the list with id
     * 
     * @param {number} id The id of the list to find
     * @return {number} Index of the playlist with id
     */
    getListIndex(id) {
        for (let i = 0; i < this.playlists.length; i++) {
            let list = this.playlists[i];
            if (list.id === id) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Accessor method for getting the playlist with id
     * 
     * @param {number} id The id of the playlist to retrieve
     * @return {Playlist} The playlist with id
     */
    getPlaylist(id) {
        for (let i = 0; i < this.playlists.length; i++) {
            if (id == this.playlists[i].id)
                return this.playlists[i];
        }
        return null;
    }

    /**
     * Accessor method for getting the number of songs in the current playlist
     * 
     * @return {number} The number of songs in the current playlist
     */
    getPlaylistSize() {
        return this.currentList.songs.length;
    }

    /**
     * Accessor method for getting the song at index
     * 
     * @param {number} index The index of the song to retrieve
     * @return {PlaylistSongPrototype} The song at index
     */
    getSong(index) {
        return this.currentList.songs[index];
    }

    /**
     * Accessor method for checking to see if a playlist is currently being viewed/edited
     * 
     * @returns {boolean} true if a playlist is loaded and being viewed/edited, false otherwise.
     */
    hasCurrentList() {
        return this.currentList !== null;
    }

    /**
     * Tests to see if a loaded playlist exists with a specific name and returns true if
     * such a playlist exists, false otherwise.
     * 
     * @param {string} testName The name of the playlist to search for.
     * @returns {boolean} true if a playlist is found with the name, false otherwise.
     */
    hasPlaylistWithName(testName) {
        for (let i = 0; i < this.playlists.length; i++) {
            let playlist = this.playlists[i];
            if (playlist.name == testName)
                return true;
        };
        return false;
    }

    /**
     * Acceessor method for getting whether or not a list name change is in progress, which
     * would mean the playlist card would contain a text field for typing in the new name.
     * 
     * @returns {boolean} true if a list name is currently being edited, false otherwise.
     */
    isListNameBeingChanged() {
        return this.listNameBeingChanged;
    }

    /**
     * This method would be called when the user selects a list for viewing/editing, it
     * would load all the list data into the workspace, like the song cards.
     * 
     * @param {string} id The id of the list to load into the workspace UI.
     */
    loadList(id) {
        // If user attempts to reload the currentList, then do nothing.
        if (this.hasCurrentList() && id === this.currentList.id) {
            this.view.highlightList(id);
            return;
        }

        let list = null;
        let found = false;
        let i = 0;
        while ((i < this.playlists.length) && !found) {
            list = this.playlists[i];
            if (list.id === id) {
                this.selectList(list);
                found = true;
            }
            i++;
        }
        this.tps.clearAllTransactions();
        let listName = "";
        if (this.hasCurrentList())
            listName = this.currentList.name;
        this.view.updateStatusBar(this.hasCurrentList(), listName);
        this.view.updateToolbarButtons(this.hasCurrentList(),
            this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
    }

    /**
     * Checks the browser's local storage to see if it contains user playlists
     * and if it does, loads them.
     * 
     * @returns {boolean} true if lists were found and loaded from local storage, false otherwise.
     */
    loadLists() {
        // CHECK TO SEE IF THERE IS DATA IN LOCAL STORAGE FOR THIS APP
        let recentLists = localStorage.getItem("recent_work");
        if (!recentLists) {
            return false;
        }
        else {
            let listsJSON = JSON.parse(recentLists);
            this.playlists = [];
            for (let i = 0; i < listsJSON.length; i++) {
                let listData = listsJSON[i];
                let songs = [];
                for (let j = 0; j < listData.songs.length; j++) {
                    let songData = listData.songs[j];
                    let title = songData.title;
                    let artist = songData.artist;
                    let youTubeId = songData.youTubeId;
                    songs[j] = new PlaylistSongPrototype(title, artist, youTubeId);
                }
                this.addNewList(listData.name, songs);
            }
            this.sortLists();
            this.view.refreshPlaylistCards(this.playlists);
            return true;
        }
    }

    /**
     * Mutator method that moves the song from one index to another in the playlist. Note
     * that once the song is moved in the model's data the view updates the UI and the
     * updated playlist is saved to local storage.
     * 
     * @param {number} fromIndex The index from which to move the song
     * @param {number} toIndex The index to which to move the song
     */
    moveSong(fromIndex, toIndex) {
        if (this.hasCurrentList()) {
            let tempArray = this.currentList.songs.filter((song, index) => index !== fromIndex);
            tempArray.splice(toIndex, 0, this.currentList.getSongAt(fromIndex))
            this.currentList.songs = tempArray;
            this.view.refreshSongCards(this.currentList);
        }
        this.saveLists();
    }

    /**
     * Performs a redo operation, which depending on the transaction at the top of the
     * stack is, will modify the loaded playlist in some way and force an update to the UI.
     */
    redo() {
        if (this.tps.hasTransactionToDo()) {
            this.tps.doTransaction();
            this.view.updateToolbarButtons(this.hasCurrentList(),
                this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
        }
    }

    /**
     * Removes the song at index from the currently loaded playlist
     * 
     * @param {number} index The location in the playlist of the song to add nothing 0 is the first song.
     */
    removeSong(index) {
        this.currentList.songs.splice(index, 1);
        this.view.refreshSongCards(this.currentList);
        this.saveLists();
    }

    /**
     * Renames the currently selected list using the provided name
     * 
     * @param {string} initName New name for the current list.
     */
    renameCurrentList(initName) {
        if (this.hasCurrentList()) {
            if (initName === "") {
                this.currentList.setName("Untitled");
            } else {
                this.currentList.setName(initName);
            }

            this.sortLists();
            this.saveLists();
            this.view.highlightList(this.currentList.id);
            this.view.hidePlaylistTextInput(this.currentList.id);
            this.view.updateStatusBar(this, this.currentList.name);
            this.view.updateToolbarButtons(this.hasCurrentList(),
                this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());

        }
    }

    /**
     * Saves all the playlists to the browser's local storage.
     */
    saveLists() {
        let playlistsString = JSON.stringify(this.playlists);
        localStorage.setItem("recent_work", playlistsString);
    }

    /**
     * Selects the list argument, setting it as the current list and updating the view
     * such that its songs can be viewed and edited.
     * 
     * @param {Playlist} listToSelect The list to select.
     */
    selectList(listToSelect) {
        // THIS IS THE LIST TO LOAD
        this.currentList = listToSelect;
        this.view.refreshSongCards(this.currentList);
        this.view.highlightList(listToSelect.id);
        this.view.updateStatusBar(this.hasCurrentList(), listToSelect.name);
    }

    /**
     * Mutator method for setting the list to delete, which is used such that
     * the dialog event handler verification can coordinate a proper response.
     * 
     * @param {number} initId The id of the list to delete.
     */
    setDeleteListId(initId) {
        this.deleteListId = initId;
    }

    /**
     * Mutator method for setting the index of the song being edited, which is used
     * such that the dialog event handler can coordinate a proper response.
     * 
     * @param {number} initIndex The index of thte song being edited in the dialog.
     */
    setEditSongIndex(initIndex) {
        this.editSongIndex = initIndex;
    }

    /**
     * Mutator method for setting the boolean variable that keeps track of when a list
     * name is being changed so as to prevent other events from being processed at
     * that time.
     * 
     * @param {boolean} flag Sets whether a list name is being edited (true) or not (false).
     */
    setListNameBeingChanged(flag, id) {
        this.listNameBeingChanged = flag;
        this.view.showPlaylistTextInput(id);
        this.view.updateToolbarButtons(this.hasCurrentList(),
            this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
    }

    /**
     * Mutator method for setting the view. Note, we are using an MVC approach so when
     * this model (i.e. the data) is updated it must notify the view such that it can
     * update the rendering or affected UI components.
     * 
     * @param {PlaylisterView} initView The V (i.e. View) in this application's MVC
     */
    setView(initView) {
        this.view = initView;
    }

    /**
     * Sorts the lists alphabetically (A-Z) by name. Note that this is done each time
     * a new list is added or deleted or renamed as the lists are always kept in 
     * sorted order.
     */
    sortLists() {
        this.playlists.sort((listA, listB) => {
            if (listA.getName().toUpperCase() < listB.getName().toUpperCase()) {
                return -1;
            }
            else if (listA.getName().toUpperCase() === listB.getName().toUpperCase()) {
                return 0;
            }
            else {
                return 1;
            }
        });
        this.view.refreshPlaylistCards(this.playlists);
    }

    /**
     * Toggles the flag representing whether the confirm dialog is open or not
     * and responds by updating the UI accordingly.
     */
    toggleConfirmDialogOpen() {
        this.confirmDialogOpen = !this.confirmDialogOpen;
        this.view.updateToolbarButtons(this.hasCurrentList(),
            this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
        if (!this.confirmDialogOpen)
            this.view.closeEditSongModal();
        return this.confirmDialogOpen;
    }

    /**
     * Undoes the most recent transaction, if there is one and updates the user
     * interface accordingly.
     */
    undo() {
        if (this.tps.hasTransactionToUndo()) {
            this.tps.undoTransaction();
            this.view.updateToolbarButtons(this.hasCurrentList(),
                this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
        }
    }

    /**
     * Unselects the list currently being viewed and edited, like when a list is being closed.
     */
    unselectCurrentList() {
        if (this.hasCurrentList()) {
            this.view.unhighlightList(this.currentList.id);
            this.currentList = null;
            this.view.updateStatusBar(false);
            this.view.clearWorkspace();
            this.tps.clearAllTransactions();
            this.view.updateToolbarButtons(this.hasCurrentList(),
                this.confirmDialogOpen, this.tps.hasTransactionToDo(), this.tps.hasTransactionToUndo());
        }
    }
}