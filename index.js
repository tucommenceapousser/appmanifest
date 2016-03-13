(function(){

var elements = {
  form: document.querySelector('form'),
  theme: document.querySelector('#theme_color'),
  lang: document.querySelector('#lang'),
  output: document.querySelector('#output pre'),
  iconTable: document.querySelector('#icons tbody'),
  addIcon: document.querySelector('#add_icons'),
  splashTable: document.querySelector('#splash_screens tbody'),
  addSplash: document.querySelector('#add_splash_screens'),
  copyManifest: document.querySelector('#copy_manifest'),
  outputManifest: document.querySelector('#output_manifest'),
  copyHead: document.querySelector('#copy_head'),
  outputHead: document.querySelector('#output_head'),
  footer: document.querySelector('footer small'),
  toggles: document.querySelectorAll('[data-toggle="collapse"]')
};

elements.form.addEventListener('change', updateOutput);

elements.theme.addEventListener('change', function(evt) {
  elements.theme.style['border-color'] = evt.target.value;
});

Array.prototype.slice.call(elements.toggles).map(function(element) {
  element.addEventListener('click', toggle);
});

elements.addIcon.addEventListener('click', addIconRow);
elements.addSplash.addEventListener('click', addSplashRow);

elements.copyManifest.addEventListener('click', copy.bind(this, elements.outputManifest));
elements.copyHead.addEventListener('click', copy.bind(this, elements.outputHead));

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

function getFormData() {
  return Array.prototype.slice.call(elements.form.elements)
    .reduce(function(form, element) {
      if (!element.value) { // skip empty values
        return form;
      }

      if (element.type === 'radio' && !element.checked) { // skip unchecked radios
        return form;
      }

      var array = element.name.split('['); // icon and splash are object arrays: icon[0][src]
      if (array.length === 1) { // not icon/splash, simple assignment
        form[element.name] = element.value;
        return form;
      }

      // icon[0][src] -> prop[index][name]
      var prop = array[0];
      var index = array[1].slice(0, -1); // 0], side-effect of split
      var name = array[2].slice(0, -1);

      if (!form[prop])        form[prop] = [];
      if (!form[prop][index]) form[prop][index] = {};

      form[prop][index][name] = element.value;
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
  }
  catch (err) {
    showMessage('<i class="fa fa-warning"></i> Couldn\'t copy to your clipboard');
  }
  finally {
    showMessage('<i class="fa fa-clipboard"></i> Copied to clipboard');
    window.getSelection().removeAllRanges();
  }
}

function showMessage(message) {
  var element = document.createElement('div');
  element.className = 'message active';
  element.innerHTML = message;
  document.body.appendChild(element);
  setTimeout(function() {
    element.classList.remove('active');
    setTimeout(function() { // wait for css animation before removing
      document.body.removeChild(element);
    }, 250);
  }, 2750); // 250ms for active animation + 2s to message display
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

reset()


if ('serviceWorker' in navigator) {
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
    console.log('sw failure', err);
  });
}

})();
