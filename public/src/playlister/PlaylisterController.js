/**
 * This class provides responses for all user interface interactions.
 * 
 * @author McKilla Gorilla
 */
import PlaylistSongPrototype from './PlaylistSongPrototype.js';//edit hw1
export default class PlaylisterController {
    constructor() { }

    addNewPlaylist() {
        if (this.model.isListNameBeingChanged()) return;      // don’t interfere with rename
        const newList = this.model.addNewList("Untitled", []); // creates, sorts, refreshes sidebar
        this.model.loadList(newList.id);                       // select it so songs area opens
    }

    /**
     * This function makes sure the event doesn't get propogated to other controls.
     */
    ignoreParentClick(event) {
        event.cancelBubble = true;
        if (event.stopPropagation) event.stopPropagation();
    }

    /**
     * This function defines the event handlers that will respond to interactions
     * with all the static user interface controls, meaning the controls that
     * exist in the original Web page. Note that additional handlers will need
     * to be initialized for the dynamically loaded content, like for controls
     * that are built as the user interface is interacted with.
     */
    registerStaticHandlers() {
        // SETUP THE TOOLBAR BUTTON HANDLERS
        this.registerEditToolbarHandlers();

        // SETUP THE MODAL HANDLERS
        this.registerModalHandlers();

        // NEW: event delegation for playlist-cards (handles duplicate clicks reliably)
        this.registerDelegatedHandlers();
    }

    /**
     * Specifies event handlers for buttons in the toolbar.
     */
    registerEditToolbarHandlers() {

        // HANDLER FOR ADDING A NEW PLAYLIST BUTTON
        document.getElementById("add-list-button").onmousedown = (event) => {
            this.addNewPlaylist();
        };
        // HANDLER FOR ADDING A NEW SONG BUTTON
        document.getElementById("add-song-button").onmousedown = (event) => {
            this.model.addTransactionToCreateSong();
        }
        // HANDLER FOR UNDO BUTTON
        document.getElementById("undo-button").onmousedown = (event) => {
            this.model.undo();
        }
        // HANDLER FOR REDO BUTTON
        document.getElementById("redo-button").onmousedown = (event) => {
            this.model.redo();
        }
        // HANDLER FOR CLOSE LIST BUTTON
        document.getElementById("close-button").onmousedown = (event) => {
            // this.model.unselectAll();
            this.model.unselectCurrentList();
        }
    }
    registerDelegatedHandlers() {//hw1 edit
        // Use event delegation to handle clicks on duplicate buttons
        const container = document.getElementById('playlist-cards');
        if (!container) return;

        container.addEventListener('mousedown', (event) => {
            const target = event.target;
            if (!target || !target.id) return;

            // DUPLICATE: buttons like duplicate-list-button-<id>
            if (target.id.startsWith('duplicate-list-button-')) {
                this.ignoreParentClick(event);

                // extract the playlist id and keep its type consistent (number or string)
                const rawId = target.id.substring('duplicate-list-button-'.length);
                const id = /^\d+$/.test(rawId) ? Number(rawId) : rawId;

                const newList = this.model.duplicateList(id);
                if (newList) this.model.loadList(newList.id);
            }
        });
    }


    /**
     * Specifies  event handlers for when confirm and cancel buttons
     * are pressed in the three modals.
     */
    registerModalHandlers() {
        // RESPOND TO THE USER CLOSING THE EDIT SONG MODAL VIA THE CANCEL BUTTON
        document.getElementById("edit-song-cancel-button").onclick = (event) => {
            // ALLOW OTHER INTERACTIONS
            this.model.toggleConfirmDialogOpen();

            // CLOSE THE MODAL
            let editSongModal = document.getElementById("edit-song-modal");
            editSongModal.classList.remove("is-visible");
        }

        // RESPOND TO THE USER CONFIRMING TO DELETE A PLAYLIST
        document.getElementById("delete-list-confirm-button").onclick = (event) => {
            // NOTE THAT WE SET THE ID OF THE LIST TO REMOVE
            // IN THE MODEL OBJECT AT THE TIME THE ORIGINAL
            // BUTTON PRESS EVENT HAPPENED
            let deleteListId = this.model.getDeleteListId();

            // DELETE THE LIST, THIS IS NOT UNDOABLE
            this.model.deleteList(deleteListId);

            // ALLOW OTHER INTERACTIONS
            this.model.toggleConfirmDialogOpen();

            // CLOSE THE MODAL
            let deleteListModal = document.getElementById("delete-list-modal");
            deleteListModal.classList.remove("is-visible");
        }

        // RESPOND TO THE USER CLOSING THE DELETE PLAYLIST MODAL
        document.getElementById("delete-list-cancel-button").onclick = (event) => {
            // ALLOW OTHER INTERACTIONS
            this.model.toggleConfirmDialogOpen();

            // CLOSE THE MODAL
            let deleteListModal = document.getElementById("delete-list-modal");
            deleteListModal.classList.remove("is-visible");
        }
    }

    /**
     * This function specifies event handling for interactions with a
     * list selection controls in the left toolbar. Note that we say these
     * are for dynamic controls because the items in the playlists list is
     * not known, it can be any number of items. It's as many items as there
     * are playlists, and users can add new playlists and delete playlists.
     * Note that the id provided must be the id of the playlist for which
     * to register event handling.
    */
    registerPlaylistCardHandlers(id) {
        // HANDLES SELECTING A PLAYLIST
        document.getElementById("playlist-card-" + id).onmousedown = (event) => {
            if (!this.model.isListNameBeingChanged()) {
                // MAKE SURE NOTHING OLD IS SELECTED
                this.model.unselectCurrentList();

                // GET THE SELECTED LIST
                this.model.loadList(id);
            }
        }
        // HANDLES DELETING A PLAYLIST
        document.getElementById("delete-list-button-" + id).onmousedown = (event) => {
            // DON'T PROPOGATE THIS INTERACTION TO LOWER-LEVEL CONTROLS
            this.ignoreParentClick(event);

            // RECORD THE ID OF THE LIST THE USER WISHES TO DELETE
            // SO THAT THE MODAL KNOWS WHICH ONE IT IS
            this.model.setDeleteListId(id);

            // VERIFY THAT THE USER REALLY WANTS TO DELETE THE PLAYLIST
            // THE CODE BELOW OPENS UP THE LIST DELETE VERIFICATION DIALOG
            this.listToDeleteIndex = this.model.getListIndex(id);
            let listName = this.model.getList(this.listToDeleteIndex).getName();
            let deleteSpan = document.getElementById("delete-list-span");
            deleteSpan.innerHTML = "";
            deleteSpan.appendChild(document.createTextNode(listName));
            let deleteListModal = document.getElementById("delete-list-modal");

            // OPEN UP THE DIALOG
            deleteListModal.classList.add("is-visible");
            this.model.toggleConfirmDialogOpen();
        }
        // HANDLES DUPLICATING A PLAYLIST
        const dupEl = document.getElementById("duplicate-list-button-" + id);
        if (dupEl) {
            dupEl.onmousedown = (e) => {
                this.ignoreParentClick(e);
                if (this.model.isListNameBeingChanged()) return;
                const newList = this.model.duplicateList(id);
                if (newList) this.model.loadList(newList.id);
            };
        }

        // FOR RENAMING THE LIST NAME
        document.getElementById("playlist-card-" + id).ondblclick = (event) => {
            let text = document.getElementById("playlist-card-text-" + id)
            // CLEAR THE TEXT
            text.innerHTML = "";

            // SHOW THE TEXT FIELD
            this.model.setListNameBeingChanged(true, id);
            let textInput = document.getElementById("playlist-card-text-input-" + id);
            textInput.focus();
            textInput.value = this.model.getPlaylist(id).name;
        }

        // SPECIFY HANDLERS FOR THE TEXT FIELD
        let textInput = document.getElementById("playlist-card-text-input-" + id);
        textInput.ondblclick = (event) => {
            this.ignoreParentClick(event);
        }
        textInput.onkeydown = (event) => {
            if (event.key === 'Enter') {
                this.model.setListNameBeingChanged(false, id);
                this.model.renameCurrentList(event.target.value);//, id);
            }
        }
        textInput.onblur = (event) => {
            this.model.setListNameBeingChanged(false, id);
            this.model.renameCurrentList(event.target.value);//, id);
        }
    }

    /**
     * This function specifies event handling for interactions with the playlist 
     * song cards. Note that we say these are for dynamic controls because the cards 
     * in the playlist are not known, it can be any number of songs. It's as many 
     * cards as there are songs in the playlist, and users can add and remove songs.
    */
    registerSongCardHandlers() {
        // SETUP THE HANDLERS FOR ALL SONG CARDS, WHICH ALL GET DONE
        // AT ONCE EVERY TIME DATA CHANGES, SINCE IT GETS REBUILT EACH TIME
        for (let i = 0; i < this.model.getPlaylistSize(); i++) {
            // GET THE CARD
            let card = document.getElementById("song-card-" + (i + 1));

            // USER WANTS TO EDIT THE SONG
            card.ondblclick = (event) => {
                // DON'T PROPOGATE THE EVENT
                this.ignoreParentClick(event);

                // WE NEED TO RECORD THE INDEX FOR THE MODAL
                let songIndex = Number.parseInt(event.target.id.split("-")[2]) - 1;
                this.model.setEditSongIndex(songIndex);
                let song = this.model.getSong(songIndex);

                // LOAD THE SONG DATA INTO THE MODAL
                document.getElementById("edit-song-modal-title-textfield").value = song.title;
                document.getElementById("edit-song-modal-artist-textfield").value = song.artist;
                document.getElementById("edit-song-modal-youTubeId-textfield").value = song.youTubeId;
                document.getElementById("edit-song-modal-year-textfield").value = (song.year ?? "");//HW 1 edit


                // OPEN UP THE MODAL
                let editSongModal = document.getElementById("edit-song-modal");
                editSongModal.classList.add("is-visible");

                // IGNORE ALL NON-MODAL EVENTS
                this.model.toggleConfirmDialogOpen();
            }

            // USER WANTS TO REMOVE A SONG FROM THE PLAYLIST
            let removeSongButton = document.getElementById("remove-song-" + i);
            removeSongButton.onclick = (event) => {
                // DON'T PROPOGATE THE EVENT
                this.ignoreParentClick(event);

                // RECORD WHICH SONG SO THE MODAL KNOWS AND UPDATE THE MODAL TEXT
                let songIndex = Number.parseInt(event.target.id.split("-")[2]);

                // PROCESS THE REMOVE SONG EVENT
                this.model.addTransactionToRemoveSong(songIndex);
            }

            // NOW SETUP ALL CARD DRAGGING HANDLERS AS THE USER MAY WISH TO CHANGE
            // THE ORDER OF SONGS IN THE PLAYLIST

            // MAKE EACH CARD DRAGGABLE
            card.setAttribute('draggable', 'true')

            // WHEN DRAGGING STARTS RECORD THE INDEX
            card.ondragstart = (event) => {
                card.classList.add("is-dragging");
                event.dataTransfer.setData("from-id", i);
            }

            // WE ONLY WANT OUR CODE, NO DEFAULT BEHAVIOR FOR DRAGGING
            card.ondragover = (event) => {
                event.preventDefault();
            }

            // STOP THE DRAGGING LOOK WHEN IT'S NOT DRAGGING
            card.ondragend = (event) => {
                card.classList.remove("is-dragging");
            }

            // WHEN AN ITEM IS RELEASED WE NEED TO MOVE THE CARD
            card.ondrop = (event) => {
                event.preventDefault();
                // GET THE INDICES OF WHERE THE CARD IS BRING DRAGGED FROM AND TO
                let fromIndex = Number.parseInt(event.dataTransfer.getData("from-id"));
                let toIndex = Number.parseInt(event.target.id.split("-")[2]) - 1;

                // ONLY ADD A TRANSACTION IF THEY ARE NOT THE SAME
                // AND BOTH INDICES ARE VALID
                if ((fromIndex !== toIndex)
                    && !isNaN(fromIndex)
                    && !isNaN(toIndex)) {
                    this.model.addTransactionToMoveSong(fromIndex, toIndex);
                }
            }
        }
    }

    /**
     * We are using an MVC-type approach, so this controller class will respond by 
     * updating the application data, which is managed by the model class. So, this 
     * function registers the model object with this controller.
     */
    setModel(initModel) {
        this.model = initModel;
        this.registerStaticHandlers();
    }
}