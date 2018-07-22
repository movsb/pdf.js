import { PDFViewerApplication } from './app';

class PDFBrowseFiles {
  constructor({ overlayName, fields, container, closeButton, },
              overlayManager, eventBus) {
    this.overlayName = overlayName;
    this.container = container;
    this.eventBus = eventBus;
    this.overlayManager = overlayManager;
    this.leftContainer = container.querySelector('.leftWrapper');
    this.rightContainer = container.querySelector('.rightWrapper');

    this.busy = false;

    let self = this;

    if (closeButton) {
        closeButton.addEventListener('click', this.close.bind(this));
    }
    this.overlayManager.register(this.overlayName, this.container,
                                 this.close.bind(this));

    this.container.querySelector('.wrapper').addEventListener('click', function(e) {
      if (self.busy) {
        console.log('busy');
        return;
      }
      self.busy = true;
      self.onclick(e);
    });
  }

  open() {
    this.overlayManager.open(this.overlayName);
    if (this.leftContainer.childElementCount === 0) {
      this.load();
    }
  }

  close() {
      this.overlayManager.close(this.overlayName);
  }

  load() {
    this.readDir(this.leftContainer);
  }

  apiRoot() {
    return 'http://127.0.0.1:8733/v1';
    return '/v1';
  }

  updateUI(element, base, files, folders) {
    let self = this;
    element.innerHTML = '';
    folders.forEach((name) => {
      let li = document.createElement('li');
      li.classList.add('folder-wrap');
      let a = document.createElement('a');
      a.classList.add('folder');
      a.setAttribute('data-path', base + '/' + name);
      a.innerText = name;
      li.appendChild(a);
      let subFolders = document.createElement('ul');
      subFolders.classList.add('folders');
      subFolders.setAttribute('data-path', base + '/' + name);
      li.appendChild(subFolders);
      element.appendChild(li);
    });
    self.rightContainer.innerHTML = '';
    files.forEach((name) => {
      let li = document.createElement('li');
      li.classList.add('file-wrap');
      let a = document.createElement('a');
      a.classList.add('file');
      a.setAttribute('data-path', base + '/' + name);
      a.innerText = name;
      li.appendChild(a);
      self.rightContainer.appendChild(li);
    });
  }

  onclick(e) {
    console.log(e.target);
    if (e.target.classList.contains('folders')) {
      this.readDir(e.target);
    } else if (e.target.classList.contains('folder')) {
      let ul = e.target.nextSibling;
      if (ul.style.display === 'block' && ul.childElementCount > 0) {
        ul.style.display = 'none';
        this.busy = false;
        return;
      }
      ul.style.display = 'block';
      this.readDir(ul);
    } else if (e.target.classList.contains('file')) {
      let path = decodeURIComponent(e.target.getAttribute('data-path'));
      this.loadFile(path);
    } else {
      this.busy = false;
    }
  }

  readDir(element) {
    let self = this;
    let base = element.getAttribute('data-path');
    let xhr = new XMLHttpRequest();
    xhr.onload = function() {
        console.log(xhr.response);
        let d = JSON.parse(xhr.response);
        self.updateUI(element, base, d.files, d.folders);
        self.busy = false;
    };
    xhr.open('GET', self.apiRoot() + '/list?base=' + encodeURIComponent(base));
    xhr.send();
  }

  loadFile(path) {
    let self = this;
    let url = this.apiRoot() + '/file?file=' + encodeURIComponent(path);
    PDFViewerApplication.open(url)
    .then(function() {
      self.close();
      self.busy = false;
      self.eventBus.dispatch('tao_fileloaded', {

      });
    })
    .catch(function() {
      alert('Failed to open file.');
      self.busy = false;
    })
    ;
  }
}

export {
    PDFBrowseFiles,
};
