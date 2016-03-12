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
  copyIndex: document.querySelector('#copy_index'),
  outputIndex: document.querySelector('#output_index'),
  toggles: document.querySelectorAll('[data-toggle="collapse"]')
};

elements.form.addEventListener('change', updateOutput);

elements.theme.addEventListener('change', function(evt) {
  elements.theme.style['border-color'] = evt.target.value;
});

Array.prototype.slice.call(elements.toggles).map(function(element) {
  element.addEventListener('click', toggle)
});

elements.addIcon.addEventListener('click', addIconRow);
elements.addSplash.addEventListener('click', addSplashRow);

elements.copyManifest.addEventListener('click', copy.bind(this, elements.outputManifest));
elements.copyIndex.addEventListener('click', copy.bind(this, elements.outputIndex));

function toggle() {
  document.querySelector(this.dataset.target).classList.toggle('in');
  var text = this.innerText === 'More...' ? 'Less...' : 'More...';
  this.innerText = text;
}

function addIconRow() {
  var index = elements.iconTable.children.length - 1;
  var tr = document.createElement('tr');
  tr.innerHTML = [
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][src]" placeholder="lowres.webp" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][sizes]" placeholder="48x48" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][type]" placeholder="image/webp" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="icons['+index+'][density]" placeholder="1" /></td>'
  ].join('\n');
  elements.iconTable.insertBefore(tr, elements.iconTable.lastElementChild);
}

function addSplashRow() {
  var index = elements.splashTable.children.length - 1;
  var tr = document.createElement('tr');
  tr.innerHTML = [
    '<td><input type="text" class="form-control form-control-sm" name="splash_screens['+index+'][src]" placeholder="/splash/lowres.webp" /></td>',
    '<td><input type="text" class="form-control form-control-sm" name="splash_screens['+index+'][sizes]" placeholder="320x240" /></td>',
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

function updateOutput() {
  var form = getFormData()
  var json = JSON.stringify(form, null, '  '); // pretty-printed, 2-spaces

  elements.outputManifest.innerText = json;
}

function copy(node) {
  var range = document.createRange();
  range.selectNodeContents(node);
  window.getSelection().addRange(range);

  try {
    document.execCommand('copy');
  }
  catch (err) {}
  finally {
    window.getSelection().removeAllRanges();
  }
}

function reset() {
  elements.form.reset();

  // personal touch
  elements.lang.value = navigator.language;
  elements.lang.placeholder = navigator.language;

  updateOutput();
}

reset()
})();
