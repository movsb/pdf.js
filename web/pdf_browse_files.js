import { PDFViewerApplication } from './app';

class PDFBrowseFiles {
  constructor({ manager, container, }) {
    this.manager = manager;
    this.container = container;
    this.leftContainer = container.querySelector('.leftWrapper');
    this.rightContainer = container.querySelector('.rightWrapper');

    this.busy = false;

    let self = this;

    this.container.querySelector('.wrapper').addEventListener('click', function(e) {
      if (self.busy) {
        console.log('busy');
        return;
      }
      self.busy = true;
      self.onclick(e);
    });

    this.load();
  }

  load() {
    this.readDir(this.leftContainer);
  }

  apiRoot() {
    if (location.host.indexOf('8888') > 0) {
      return 'http://127.0.0.1:8733/v1';
    }
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
      self.manager.close();
      self.busy = false;
    })
    .catch(function(e) {
      console.log(e);
      alert('Failed to open file.');
      self.busy = false;
    })
    ;
  }
}

class PDFUploadFiles {
  constructor({ manager, container, }) {
    this.manager = manager;
    this.container = container;

    this.name = container.querySelector('.name');
    this.file = container.querySelector('.file');
    this.isbn = container.querySelector('.isbn');
    this.submit = container.querySelector('.submit');

    this.name.addEventListener('dblclick', function() {
      this.file.click();
    }.bind(this));

    this.file.addEventListener('change', function(e) {
      if (e.target.files.length <= 0) {
        return;
      }
      this.name.value = e.target.files[0].name.replace(/\.[^/.]+$/, '');
    }.bind(this));

    this.form = this.container.querySelector('.form');
    this.form.addEventListener('submit', this.onsubmit.bind(this));
  }

  onsubmit(e) {
    let self = this;
    function value(name) {
      return self.form.elements[name].value;
    }
    try {
      if (!value('name')) {
        throw '名字不可以为空';
      } else if (!value('file')) {
        throw '请选择PDF文件';
      } else if (!value('isbn')) {
        throw '请选择ISBN编号';
      }
    } catch (x) {
      alert(x);
      e.preventDefault();
      return false;
    }

    let formData = new FormData(this.form);
    let xhr = new XMLHttpRequest();
    xhr.onload = function() {
        console.log(this);
        if (xhr.status === 200) {
            alert('上传成功');
            this.resetForm();
        } else {
            alert(xhr.responseText);
        }
    }.bind(this);
    xhr.onerror = function() {
      alert('error');
    };
    xhr.open('POST', this.manager.apiRoot() + '/upload');
    xhr.send(formData);

    e.preventDefault();
    return false;
  }

  resetForm() {
      this.file.value = '';
      this.name.value = '';
      this.isbn.value = '';
  }
}

class PDFSearchFiles {
  constructor({ manager, container, }) {
    this.manager = manager;
    this.container = container;

    this.form = this.container.querySelector('.form');
    this.form.addEventListener('submit', this.onsubmit.bind(this));

    // this.s = container.querySelector('.s');
    this.results = this.container.querySelector('.results');
    this.results.addEventListener('click', this.onResultsClick.bind(this));
  }

  onsubmit(e) {
    let xhr = new XMLHttpRequest();
    xhr.onload = function() {
      if (xhr.status === 200) {
        this.updateResults(JSON.parse(xhr.responseText));
      } else {
          alert(xhr.responseText);
      }
    }.bind(this);
    xhr.onerror = function() {
      alert('error');
    };
    let formData = new FormData(this.form);
    let query = new URLSearchParams(formData).toString();
    xhr.open('GET', this.manager.apiRoot() + '/search?' + query);
    xhr.send();

    e.preventDefault();
    return false;
  }

  onResultsClick(evt) {
    if (evt.target.classList.contains('book')) {
        let hash = evt.target.getAttribute('data-hash');
        this.manager.loadFile(hash, function() {

        });
    }
  }

  updateResults(books) {
    this.results.innerText = '';
    [].forEach.call(books, (book) => {
      let li = document.createElement('li');
      li.classList.add('book');
      li.setAttribute('data-hash', book.hash);
      li.innerText = book.name;
      this.results.appendChild(li);
    });
  }
}

class PDFTaoManager {
  constructor({ overlayName, fields, container, },
              overlayManager, eventBus, l10n) {
    this.overlayName = overlayName;
    this.container = container;
    this.overlayManager = overlayManager;

    let closeButton = this.container.querySelector('.closeButton');
    closeButton.addEventListener('click', this.close.bind(this));
    this.overlayManager.register(this.overlayName, this.container,
                                 this.close.bind(this));

    this.tabContainer = this.container.querySelector('.tabs');
    this.pageContainer = this.container.querySelector('.pages');

    this.lastTab = null;
    this.lastPage = null;

    this.pageSearchFiles = this.container.querySelector('.page.search-files');
    this.pageBrowseFiles = this.container.querySelector('.page.browse-files');
    this.pageUploadFiles = this.container.querySelector('.page.upload-files');

    this.tabContainer.addEventListener('click', function(evt) {
      this.switchTab(evt.target);
    }.bind(this));

    this.browseFiles = new PDFBrowseFiles({
      manager: this,
      container: this.container.querySelector('.page.browse-files'),
    });

    this.uploadFiles = new PDFUploadFiles({
        manager: this,
        container: this.container.querySelector('.page.upload-files'),
    });

    this.searchFiles = new PDFSearchFiles({
      manager: this,
      container: this.container.querySelector('.page.search-files'),
    });
  }

  open() {
    this.overlayManager.open(this.overlayName);
    // set default tab
    if (this.lastTab === null) {
      this.switchTab(this.container.querySelector('.tabs .search'));
    }
  }

  close() {
    this.overlayManager.close(this.overlayName);
  }

  switchTab(ele) {
    if (this.lastTab !== null) {
      this.lastTab.classList.remove('active');
    }
    if (this.lastPage !== null) {
      this.lastPage.classList.add('hidden');
    }

    if (ele.classList.contains('search')) {
      ele.classList.add('active');
      this.pageSearchFiles.classList.remove('hidden');
      this.lastTab = ele;
      this.lastPage = this.pageSearchFiles;
    } else if (ele.classList.contains('browse')) {
      ele.classList.add('active');
      this.pageBrowseFiles.classList.remove('hidden');
      this.lastTab = ele;
      this.lastPage = this.pageBrowseFiles;
    } else if (ele.classList.contains('upload')) {
      ele.classList.add('active');
      this.pageUploadFiles.classList.remove('hidden');
      this.lastTab = ele;
      this.lastPage = this.pageUploadFiles;
    }
  }

  apiRoot() {
    if (location.host.indexOf('8888') > 0) {
      return 'http://127.0.0.1:8733/v1';
    }
    return '/v1';
  }

  loadFile(hash, callback) {
    let self = this;
    let url = this.apiRoot() + '/download?hash=' + encodeURIComponent(hash);
    PDFViewerApplication.open(url)
    .then(function() {
      self.close();
      if (typeof callback === 'function') {
          callback();
      }
    })
    .catch(function(e) {
      console.log(e);
      alert('Failed to open file.');
      if (typeof callback === 'function') {
          callback();
      }
    })
    ;
  }
}

export {
    PDFTaoManager,
};
