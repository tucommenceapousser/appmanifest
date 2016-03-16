(function(){

// redirect gh-pages http -> https, to allow sw to work
if (window.location.host === 'tomitm.github.io' && window.location.protocol !== 'https:') {
  window.location.protocol = 'https:';
}

var appPathExp = new RegExp('^https?:\/\/tomitm.github.io\/appmanifest\/.*');
var npmPathExp = new RegExp('^https?:\/\/npmcdn.com\/appmanifest\/.*');
var ravenConfig = {
  whitelistUrls: [appPathExp, npmPathExp],
  includeUrls: [appPathExp]
}

// thanks @mitchhentges for hosting
Raven.config('https://1245a5c1dc094525aed3bc905181cc58@sentry.fuzzlesoft.ca/3', ravenConfig).install()

var elements = {
  form: document.querySelector('form'),
  lang: document.querySelector('#lang'),
  output: document.querySelector('#output pre'),
  iconTable: document.querySelector('#icons tbody'),
  addIcon: document.querySelector('#add_icons'),
  splashTable: document.querySelector('#splash_screens tbody'),
  addSplash: document.querySelector('#add_splash_screens'),
  relatedTable: document.querySelector('#related_applications tbody'),
  addRelated: document.querySelector('#add_related_applications'),
  copyManifest: document.querySelector('#copy_manifest'),
  outputManifest: document.querySelector('#output_manifest'),
  copyHead: document.querySelector('#copy_head'),
  outputHead: document.querySelector('#output_head'),
  footer: document.querySelector('footer small'),
  messages: document.querySelector('#messages'),
  colors: document.querySelectorAll('.form-control-color'),
  toggles: document.querySelectorAll('[data-toggle="collapse"]')
};

elements.form.addEventListener('change', updateOutput);

Array.prototype.slice.call(elements.colors).map(function(element) {
  element.addEventListener('change', setBorderColor);
});

Array.prototype.slice.call(elements.toggles).map(function(element) {
  element.addEventListener('click', toggle);
});

elements.addIcon.addEventListener('click', addIconRow);
elements.addSplash.addEventListener('click', addSplashRow);
elements.addRelated.addEventListener('click', addRelatedRow);

elements.copyManifest.addEventListener('click', copy.bind(this, elements.outputManifest));
elements.copyHead.addEventListener('click', copy.bind(this, elements.outputHead));

function setBorderColor() {
  this.style['border-color'] = this.value;
}

function toggle() {
  document.querySelector(this.dataset.target).classList.toggle('in');
  var text = this.innerText === 'More...' ? 'Less...' : 'More...';
  this.innerText = text;
}

function addIconRow() {
  var index = elements.iconTable.children.length - 1;
  var tr = document.createElement('tr');
  tr.innerHTML = [
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][src]" placeholder="homescreen.png" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][sizes]" placeholder="192x192" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][type]" placeholder="image/png" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][density]" placeholder="1" /></td>'
  ].join('\n');
  elements.iconTable.insertBefore(tr, elements.iconTable.lastElementChild);
}

function addSplashRow() {
  var index = elements.splashTable.children.length - 1;
  var tr = document.createElement('tr');
  tr.innerHTML = [
    '<td><input type="text" class="form-control form-control-sm" name="splash_screens['+index+'][src]" placeholder="splash.webp" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="splash_screens['+index+'][sizes]" placeholder="1334x750" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="splash_screens['+index+'][type]" placeholder="image/webp" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="splash_screens['+index+'][density]" placeholder="1" /></td>'
  ].join('\n');
  elements.splashTable.insertBefore(tr, elements.splashTable.lastElementChild);
}

function addRelatedRow() {
  var index = elements.relatedTable.children.length - 1;
  var tr = document.createElement('tr');
  tr.innerHTML = [
    '<td><input type="text" class="form-control form-control-sm" name="related_applications['+index+'][platform]" placeholder="play" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="related_applications['+index+'][id]" placeholder="com.example.app" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="related_applications['+index+'][url]" placeholder="https://play.google.com/store/apps/details?id=com.example.app1" /></td>',
  ].join('\n');
  elements.relatedTable.insertBefore(tr, elements.relatedTable.lastElementChild);
}

function getFormData() {
  return Array.prototype.slice.call(elements.form.elements)
    .reduce(function(form, element) {
      var value = element.value;
      if (!value) { // skip empty values
        return form;
      }

      if (element.type === 'number') { // numbers shouldn't be strings
        value = parseFloat(value) || value;
      }

      if (element.type === 'radio' && !element.checked) { // skip unchecked radios
        return form;
      }

      if (element.type === 'checkbox') {
        value = element.checked;
        if (!value) { // skip unchecked values (default for related is false anyway)
          return form;
        }
      }

      var array = element.name.split('['); // icon and splash are object arrays: icon[0][src]
      if (array.length === 1) { // not icon/splash, simple assignment
        form[element.name] = value;
        return form;
      }

      // icon[0][src] -> prop[index][name]
      var prop = array[0];
      var index = array[1].slice(0, -1); // 0], side-effect of split
      var name = array[2].slice(0, -1);

      if (!form[prop])        form[prop] = [];
      if (!form[prop][index]) form[prop][index] = {};

      form[prop][index][name] = value;
      form[prop] = form[prop].filter(function(prop) { return prop !== null; });
      return form;
    }, {});
}

function getImageAttrs(image) {
  var attrs = [];
  if (image.type)    attrs.push('type="' + image.type + '"');
  if (image.sizes)   attrs.push('sizes="' + image.sizes + '"');
  if (image.density) attrs.push('density="' + image.density + '"');
  if (image.src)     attrs.push('href="' + image.src + '"');

  return attrs.join(' ');
}

function generateHead(form) {
  var meta = [
    '<link rel="manifest" href="manifest.json">',
    '',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">'
  ];

  var name = form.short_name || form.name;
  if (name) {
    meta.push('<meta name="application-name" content="' + name + '">');
    meta.push('<meta name="apple-mobile-web-app-title" content="' + name + '">');
  }

  if (form.theme_color) {
    meta.push('<meta name="theme-color" content="' + form.theme_color + '">');
    meta.push('<meta name="msapplication-navbutton-color" content="' + form.theme_color + '">');
    meta.push('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">');
  }

  if (form.icons) {
    form.icons.forEach(function(icon) {
      var attrs = getImageAttrs(icon);
      meta.push('<link rel="icon" ' + attrs + '>');
      meta.push('<link rel="apple-touch-icon" ' + attrs + '>');
    });
  }

  if (form.splash_screens) {
    form.splash_screens.forEach(function(splash) {
      var attrs = getImageAttrs(icon);
      meta.push('<link rel="apple-touch-startup-image" ' + attrs + '>');
    });
  }

  if (form.start_url) {
    meta.push('<meta name="msapplication-starturl" content="'+form.start_url+'">');
  }

  meta.push('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">');
  return meta.join('\n');
}

function updateOutput() {
  var form = getFormData();
  var manifest = JSON.stringify(form, null, '  '); // pretty-printed, 2-spaces
  var head = generateHead(form);

  elements.outputManifest.innerText = manifest;
  elements.outputHead.innerText = head;
}

function copy(node) {
  var range = document.createRange();
  range.selectNodeContents(node);
  window.getSelection().removeAllRanges(); // ensure no current selection, otherwise copy may fail
  window.getSelection().addRange(range);

  try {
    document.execCommand('copy');
    showMessage('<i class="fa fa-clipboard"></i> Copied to clipboard');
  } catch (err) {
    showMessage('<i class="fa fa-warning"></i> Couldn\'t copy to your clipboard');
  } finally {
    window.getSelection().removeAllRanges();
  }
}

function showMessage(message) {
  var element = document.createElement('div');
  element.className = 'message active';
  element.innerHTML = message;
  elements.messages.appendChild(element);
  setTimeout(function() {
    element.classList.remove('active');
    setTimeout(function() { // wait for css animation before removing
      elements.messages.removeChild(element);
    }, 250);
  }, 2750); // 250ms for active animation + 2.5s to message display
}

function reset() {
  elements.form.reset();

  // personal touch
  elements.lang.value = navigator.language;
  elements.lang.placeholder = navigator.language;

  updateOutput();
}

var footers = [
  '',
  ' <i class="fa fa-rocket"></i>',
  ' to make the web great again',
  ' who wants more web apps on his homescreen',
  ' who is tired of seeing browser UI',
  ' because it\'s ' + new Date().getFullYear()
];
var rand = Math.floor(Math.random() * footers.length);
elements.footer.innerHTML += footers[rand];

reset();

var shouldRegister = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
if ('serviceWorker' in navigator && shouldRegister) {
  navigator.serviceWorker.register('sw.js').then(function(registration) {
    // only show message on worker installed event
    registration.onupdatefound = function() {
      var worker = registration.installing;
      worker.onstatechange = function() {
        if (worker.state === "installed") {
          showMessage('<i class="fa fa-download"></i> Caching completed. This app works offline!');
        }
      };
    };
  }).catch(function(err) {
    Raven.captureException(err);
    console.log('sw failure', err);
  });
}

})();
