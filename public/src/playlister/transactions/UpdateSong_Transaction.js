export default class UpdateSong_Transaction {
  constructor(model, index, oldSnapshot, newData) {
    this.model = model;
    this.index = index;
    this.oldSnapshot = oldSnapshot; // {title, artist, youTubeId, year?}
    this.newData = newData;         // {title?, artist?, youTubeId?, year?}
  }
  doTransaction()  { this.model.updateSong(this.index, this.newData); }
  undoTransaction() { this.model.updateSong(this.index, this.oldSnapshot); }
}
