import PlaylisterController from "./PlaylisterController.js";

/**
 * The PlaylistView class manages the view of our Web application, providing services
 * for loading data into our user interface (UI) controls and dynamically updating,
 * including creating and destroying, UI components. Note that the user interface (UI)
 * of this application is implemented using an MVC type-strategy (Observer design pattern)
 * where one class manages the application state/data (Model), one class manages the
 * application UI components (View), and one class manages the event handling (Controller).
 * 
 * @author McKilla Gorilla
 */
export default class PlaylisterView {
    /**
     * Object initialization is done via the init method rather than the constructor. Note
     * that for updating the browser view this class will make use of the document object,
     * is a global variable that represents the Document Object Model (DOM), a K-ary
     * tree initialized and provided by the browser that stores all the HTML components 
     * for the Web page currently being viewed. Updating the DOM updates what the user sees 
     * in the browser.
     */
    constructor() { }

    /**
     * Adds a playlist card to to the left sidebar in the UI.
     * 
     * @param {Playlist} newList The list to be added.
     */
    appendListToView(newList) {
        // EACH CARD WILL HAVE A UNIQUE ID
        let listId = "playlist-card-" + newList.id;

        // MAKE A DEEP COPY OF THE PROTOTYPE FOR OUR NEW PLAYLIST CARD
        let playlistCard = document.getElementById("playlist-card-prototype").cloneNode(true);
        playlistCard.id = listId;
        playlistCard.classList.add("playlist-card", "unselected-playlist-card");

        playlistCard.querySelector("span").id = "playlist-card-text-" + newList.id;
        playlistCard.querySelector("span").textContent = newList.name;

        let textInput = playlistCard.querySelector("#playlist-card-text-input-");
        textInput.id += newList.id;

        const dupBtn = playlistCard.querySelector('input[id^="duplicate-list-button-"]');
        if (dupBtn) dupBtn.id += newList.id;// HW1 EDIT

        playlistCard.querySelector('input[id^="delete-list-button-"]').id += newList.id;

        playlistCard.hidden = false;

        // AND PUT THE NEW CARD INTO THE LISTS DIV
        let listsElement = document.getElementById("playlist-cards");
        listsElement.appendChild(playlistCard);

        // SETUP THE HANDLER FOR WHEN SOMEONE MOUSE CLICKS ON OUR LIST
        this.controller.registerPlaylistCardHandlers(newList.id);
    }

    /**
     * This removes all the songs from UI workspace, which should be
     * done whenever a list is closed.
    */
    clearWorkspace() {
        // REMOVE THE ITEMS        
        let itemsDiv = document.getElementById("song-cards");
        itemsDiv.innerHTML = "";
    }

    /**
     * Closes the edit song modal, which would be because either the
     * confirm or cancel button was pressed.
     */
    closeEditSongModal() {
        // CLOSE THE MODAL
        let editSongModal = document.getElementById("edit-song-modal");
        editSongModal.classList.remove("is-visible");
    }

    /**
     * This function disables the button that has the id parameter
     * as it's id property. This should be done as part of a foolproof
     * design strategy.
     * 
     * @param {number} id The id of the button control to disable.
     */
    disableButton(id) {
        let button = document.getElementById(id);
        button.classList.add("disabled");
        button.disabled = true;
    }

    /**
     * This function enables the button that has the id parameter
     * as it's id property. This should be done as part of a foolproof
     * design strategy.
     * 
     * @param {number} id The id of the button control to enable.
     */
    enableButton(id) {
        let button = document.getElementById(id);
        button.classList.remove("disabled");
        button.disabled = false;
    }

    /**
     * Hides the textfield control on the playlist card corresponding to id.
     * 
     * @param {number} id The id of the playlist whose textfield we wish to hide.
     */
    hidePlaylistTextInput(id) {
        document.getElementById("playlist-card-text-" + id).hidden = false;
        document.getElementById("playlist-card-text-input-" + id).hidden = true;
    }

    /**
     * Changes the background of a list card to make it look selected.
     * 
     * @param {number} listId The id of the list card to highlight.
     */
    highlightList(listId) {
        // HIGHLIGHT THE LIST
        let listCard = document.getElementById("playlist-card-" + listId);
        listCard.classList.remove("unselected-playlist-card");
        listCard.classList.add("selected-playlist-card");
    }

    /**
     * The application's UI starts with the editing buttons disabled.
     */
    init() {
        this.disableButton('add-song-button');
        this.disableButton('undo-button');
        this.disableButton('redo-button');
        this.disableButton('close-button');
    }

    /**
     * This function is called each time the number of lists or the names
     * of lists change, like when a list is added, deleted, or renamed. It
     * simply rebuilds the cards in playlist-cards.
     * 
     * @param {Playlist[]} lists All the lists to be shown.
    */
    refreshPlaylistCards(lists) {
        // GET THE UI CONTROL WE WILL APPEND IT TO
        let listsElement = document.getElementById("playlist-cards");
        listsElement.innerHTML = "";

        // APPEND A SELECTION CARD FOR EACH PLAYLIST
        for (let i = 0; i < lists.length; i++) {
            let list = lists[i];
            this.appendListToView(list);
        }
    }

    /**
     * Called each time a song is added, removed, moved, or updated,
     * this function rebuilds all the song cards for the selected playlist.
     * 
     * @param {Playlist} playlist The playlist whose songs are to be reshown.
     */
    refreshSongCards(playlist) {
        // CLEAR OUT THE OLD SONG CARDS
        let itemsDiv = document.getElementById("song-cards");
        itemsDiv.innerHTML = "";

        // FOR EACH SONG
        for (let i = 0; i < playlist.songs.length; i++) {
            // MAKE AN ITEM (i.e. CARD)
            let song = playlist.getSongAt(i);
            let itemDiv = document.createElement("div");
            itemDiv.classList.add("song-card");
            itemDiv.classList.add("unselected-song-card");
            itemDiv.id = "song-card-" + (i + 1);

            // HAVE THE TEXT LINK TO THE YOUTUBE VIDEO
            let youTubeLink = document.createElement("a");
            youTubeLink.classList.add("song-card-title");
            youTubeLink.href = "https://www.youtube.com/watch?v=" + song.youTubeId;
            youTubeLink.target = 1;
            youTubeLink.innerHTML = song.title;

            let bySpan = document.createElement("span");
            bySpan.class = "song-card-by";
            bySpan.innerHTML = " by ";

            let artistSpan = document.createElement("span");
            artistSpan.class = "song-card-artist";
            artistSpan.innerHTML = song.artist;

            // PUT THE CONTENT INTO THE CARD
            let songNumber = document.createTextNode("" + (i + 1) + ". ");
            itemDiv.appendChild(songNumber);
            itemDiv.appendChild(youTubeLink);
            itemDiv.appendChild(bySpan);
            itemDiv.appendChild(artistSpan);

            // MAKE THE DELETE LIST BUTTON
            let deleteButton = document.createElement("input");
            deleteButton.setAttribute("type", "button");
            deleteButton.setAttribute("id", "remove-song-" + i);
            deleteButton.setAttribute("class", "song-card-button");
            deleteButton.setAttribute("value", "\u2715");
            itemDiv.appendChild(deleteButton);

            // AND PUT THE CARD INTO THE UI
            itemsDiv.appendChild(itemDiv);
        }
        // NOW THAT THE CONTROLS EXIST WE CAN REGISTER EVENT
        // HANDLERS FOR THEM
        this.controller.registerSongCardHandlers();
    }

    /**
     * When UI controls are dynamically created by this object they may need
     * to register event handlers, like for songs in the playlist. Thus, when
     * view components are created they will have to wire proper coded responses
     * in the controller. This method sets the controller to use for our MVC
     * implementation.
     * 
     * @param {PlaylisterController} initController The controller object that
     * will manage event handling for the application. The view needs this to
     * connect its components to the proper event handling.
     */
    setController(initController) {
        this.controller = initController;
    }

    /**
     * Shows the textfield control on the playlist card corresponding to id.
     * 
     * @param {number} id The id of the playlist whose textfield we wish to show.
     */
    showPlaylistTextInput(id) {
        document.getElementById("playlist-card-text-" + id).hidden = true;
        document.getElementById("playlist-card-text-input-" + id).hidden = false;
    }

    /**
     * Changes the background of a list card so it doesn't look selected.
     * 
     * @param {number} listId The id of the list card no remove highlighting.
     */
    unhighlightList(listId) {
        // HIGHLIGHT THE LIST
        let listCard = document.getElementById("playlist-card-" + listId);
        listCard.classList.add("unselected-playlist-card");
        listCard.classList.remove("selected-playlist-card");
    }

    /**
     * Displays the name of the loaded list in the status bar.
     */
    updateStatusBar(hasCurrentList, currentListName) {
        let statusBar = document.getElementById("statusbar");
        if (hasCurrentList) {
            statusBar.innerHTML = currentListName;
        } else {
            statusBar.innerHTML = '';
        }
    }

    /**
     * Implements our foolproof design strategy so that when toolbar
     * buttons cannot be used they are disabled.
     */
    updateToolbarButtons(hasCurrentList, isConfirmDialogOpen, hasTransactionToDo, hasTransactionToUndo) {
        this.enableButton("close-button");
        this.enableButton("add-song-button");
        if (!hasTransactionToUndo) {
            this.disableButton("undo-button");
        }
        else {
            this.enableButton("undo-button");
        }
    }
}