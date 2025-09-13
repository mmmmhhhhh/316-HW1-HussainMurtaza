import PlaylisterModel from './PlaylisterModel.js';
import PlaylisterView from './PlaylisterView.js';
import PlaylisterController from './PlaylisterController.js';
import PlaylistSongPrototype from './PlaylistSongPrototype.js';

/**
 * Entry point: wires MVC and loads lists (localStorage first, then JSON seed).
 */
export class PlaylisterApp {
    constructor() {
        // Build MVC
        this.model = new PlaylisterModel();
        this.view = new PlaylisterView();
        this.controller = new PlaylisterController();

        this.model.setView(this.view);
        this.view.setController(this.controller);
        this.controller.setModel(this.model);
    }

    /**
     * Loads playlists from a JSON file (supports 3-arg or 4-arg songs incl. year).
     * Accepts a single path or an array of paths; tries them in order until one works.
     * Returns true if something was successfully loaded.
     */
    async loadListsFromJSON(jsonPaths) {
        const paths = Array.isArray(jsonPaths) ? jsonPaths : [jsonPaths];

        for (const p of paths) {
            try {
                const res = await fetch(p, { cache: 'no-store' });
                if (!res.ok) continue;

                const data = await res.json();
                const lists = Array.isArray(data?.playlists) ? data.playlists : [];

                for (const listData of lists) {
                    const songs = (listData.songs || []).map(s => {
                        // Prefer 4-arg (title, artist, year, youTubeId); fallback to 3-arg.
                        try {
                            return new PlaylistSongPrototype(s.title, s.artist, s.year, s.youTubeId);
                        } catch {
                            return new PlaylistSongPrototype(s.title, s.artist, s.youTubeId);
                        }
                    });
                    this.model.addNewList(listData.name, songs);
                }

                this.model.sortLists();
                this.model.saveLists();
                return true;
            } catch {
                // try next path
            }
        }
        return false;
    }

    /**
     * Kicks off the app once the DOM is ready.
     */
    start() {
        this.view.init();

        // 1) Try localStorage
        const loadedFromLocal = this.model.loadLists();
        if (loadedFromLocal) return;

        // 2) Seed from JSON (your repo has src under /public, so data is /public/data)
        this.loadListsFromJSON([
            '/public/data/playlists.json',       // our suggested name
            '/public/data/default_lists.json'    // fallback to professor’s original
        ]);
    }
}

window.onload = () => {
    const app = new PlaylisterApp();
    app.start();
};
