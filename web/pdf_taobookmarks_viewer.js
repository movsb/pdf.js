class PDFTaoBookmarksViewer {
  constructor({ container, eventBus, }) {
    this.container = container;
    this.eventBus = eventBus;

    this.reset();

    this.eventBus.on('tao_fileloaded', function() {
        console.log('file loaded');
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            let d = JSON.parse(xhr.response);
            console.log(d);
        };
        xhr.open('GET', 'http://127.0.0.1:8733/v1/bookmarks');
        xhr.send();
    }.bind(this));
  }

  reset() {

  }
}

export {
  PDFTaoBookmarksViewer,
};
