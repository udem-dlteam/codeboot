/* ----- UI helpers ----- */

CodeBootVM.prototype.scrollTo = function (elementOrSelector) {
    var elementOffset = $(elementOrSelector).position().top;
    $('.cb-editors').animate({scrollTop: elementOffset}, 400);
};

/* ----- Internal file system ----- */

var BUILTIN_FILES = {

    'sample/hello.js' :
        '// This program prints a famous greeting\n' +
        '\n' +
        'print("Hello, world!");\n',

    'sample/hello.py' :
        '# This program prints a famous greeting\n' +
        '\n' +
        'print("Hello, world!")\n',

    'sample/sqrt2.js' :
        '// This program computes the square root of 2 without using Math.sqrt\n' +
        '\n' +
        'var n = 2;       // number whose square root is to be computed\n' +
        'var approx = n;  // first approximation of sqrt(n)\n' +
        '\n' +
        'for (;;) {\n' +
        '    next = (approx + n/approx) / 2;  // improve approximation\n' +
        '    if (next == approx)              // stop when no improvement\n' +
        '        break;\n' +
        '}\n' +
        '\n' +
        'print(approx);  // print square root of n\n',

    'sample/sqrt2.py' :
        '# This program computes the square root of 2 without using math.sqrt\n' +
        '\n' +
        'n = 2       # number whose square root is to be computed\n' +
        'approx = n  # first approximation of sqrt(n)\n' +
        '\n' +
        'while True:\n' +
        '    next = (approx + n/approx) / 2  # improve approximation\n' +
        '    if next == approx:              # stop when no improvement\n' +
        '        break\n' +
        '    approx = next\n' +
        '\n' +
        'print(approx)  # print square root of n\n'
};

BUILTIN_FILES = {};
NEW_FILE_DEFAULT_CONTENT = '';

function CodeBootFile(fs, filename, content, opts) {

    var file = this;
    var vm = fs.vm;

    file.fs = fs;
    file.filename = filename;
    file.content = (content !== undefined) ? content : NEW_FILE_DEFAULT_CONTENT;
    file.cursor = null;
    file.stamp = 0;

    new CodeBootFileEditor(file); // initializes file.fe

    if (opts) {
        for (var prop in opts) {
            file[prop] = opts[prop];
        }
    }
}

CodeBootFile.prototype.getContent = function () {

    var file = this;

    if (file.fe.isEnabled()) {
        return file.fe.getValue();
    } else {
        return file.content;
    }
};

CodeBootFile.prototype.setContent = function (content) {

    var file = this;

    file.content = content;
    file.fe.setValue(content);
};

CodeBootFile.prototype.save = function () {

    var file = this;

    if (file.fe.isEnabled()) {
        var oldContent = file.content;
        var newContent = file.fe.getValue();
        if (newContent !== oldContent) {
            file.content = newContent;
            file.stamp += 1;
        }
    }
};

CodeBootFile.prototype.serialize = function () {

    var file = this;

    var json = {
        filename: file.filename,
        content: file.getContent(),
        cursor: file.cursor === null ?
                {line: 0, ch: 0} :
                {line: file.cursor.line, ch: file.cursor.ch},
        stamp: file.stamp
    };

    return json;
};

CodeBootFile.prototype.clone = function () {

    var file = this;
    var other = new CodeBootFile(file.fs, file.filename, file.content);

    for (var prop in file) {
        if (Object.prototype.hasOwnProperty.call(file, prop)) {
            other[prop] = file[prop];
        }
    }

    return other;
};

CodeBootFile.prototype.setReadOnly = function (enableReadOnly) {

    var file = this;
    var vm = file.fs.vm;

    file.fe.editor.markText(vm.beginningOfEditor(),
                            vm.endOfEditor(),
                            {
                                readOnly: enableReadOnly,
                                inclusiveLeft: true,
                                inclusiveRight: true
                            });
};

function CodeBootFileSystem(vm) {

    var fs = this;

    fs.vm = vm;

    new CodeBootFileEditorManager(fs); // initializes fs.fem

    vm.fs = fs;
}

CodeBootFileSystem.prototype.init = function () {

    var fs = this;

    fs.removeAllEditors();
    fs.clear();
    fs.rebuildFileMenu();
};

CodeBootFileSystem.prototype.clear = function () {

    var fs = this;

    fs.builtins = {};
    fs.files = Object.create(fs.builtins);
    fs._loadBuiltins();
};

CodeBootFileSystem.prototype._loadBuiltins = function () {

    var fs = this;

    for (var filename in BUILTIN_FILES) {
        var f = new CodeBootFile(fs, filename, BUILTIN_FILES[filename]);
        fs.builtins[filename] = f;
    };
};

CodeBootFileSystem.prototype._asFilename = function (fileOrFilename) {

    var fs = this;

    if (typeof fileOrFilename === 'string') return fileOrFilename;
    return fileOrFilename.filename;
};

CodeBootFileSystem.prototype._asFile = function (fileOrFilename) {

    var fs = this;

    if (typeof fileOrFilename !== 'string') return fileOrFilename;
    return fs.getByName(fileOrFilename);
};

CodeBootFileSystem.prototype.isBuiltin = function (fileOrFilename) {

    var fs = this;
    var filename = fs._asFilename(fileOrFilename);

    return Object.prototype.hasOwnProperty.call(fs.builtins, filename);
};

CodeBootFileSystem.prototype.addFile = function (f) {

    var fs = this;

    fs.files[f.filename] = f;
};

CodeBootFileSystem.prototype.hasFile = function (fileOrFilename) {

    var fs = this;
    var filename = fs._asFilename(fileOrFilename);

    return Object.prototype.hasOwnProperty.call(fs.files, filename) ||
           Object.prototype.hasOwnProperty.call(fs.builtins, filename);
};

CodeBootFileSystem.prototype.generateUniqueFilename = function () {

    var fs = this;
    var prefix = 'untitled';
    var candidateName;

    for (var index = 1; ; index++) {
        candidateName = prefix + (index===1 ? '' : index) + fs.vm.lang.getExts()[0];
        if (!fs.hasFile(candidateName)) break;
    }

    return candidateName;
};

CodeBootFileSystem.prototype.getByName = function (filename) {

    var fs = this;

    if (!fs.hasFile(filename)) {
        throw 'File not found: "' + filename + '"';
    }

    var file = fs.files[filename];

    if (!Object.prototype.hasOwnProperty.call(fs.files, filename)) {
        // This is a builtin file, make an editable copy
        file = file.clone();
        fs.files[filename] = file;
    }

    return file;
};

CodeBootFileSystem.prototype.deleteFile = function (fileOrFilename) {

    var fs = this;
    var filename = fs._asFilename(fileOrFilename);

    if (fs.hasFile(filename)) {
        delete fs.files[filename];
        return true;
    }

    return false;
};

CodeBootFileSystem.prototype.renameFile = function (fileOrFilename, newFilename) {

    var fs = this;

    if (fs.hasFile(newFilename)) {
        throw 'File already exists: "' + newFilename + '"';
    }

    var file = fs._asFile(fileOrFilename);

    delete fs.files[file.filename];
    file.filename = newFilename;
    fs.addFile(file);
};

CodeBootFileSystem.prototype.getContent = function (fileOrFilename) {

    var fs = this;
    var file = fs._asFile(fileOrFilename);

    return file.getContent();
};

CodeBootFileSystem.prototype.getEditor = function (fileOrFilename) {

    var fs = this;

    return fs._asFile(fileOrFilename).fe.editor;
};

CodeBootFileSystem.prototype.setContent = function (fileOrFilename, content) {

    var fs = this;
    var file = fs._asFile(fileOrFilename);

    file.setContent(content);
};

CodeBootFileSystem.prototype.each = function (callback, selector) {

    var fs = this;

    if (!selector) selector = function (f) { return true; };

    for (var filename in fs.files) {

        if (!fs.hasFile(filename)) continue; // Prune Object method name

        var file = fs.getByName(filename);
        if (selector(file)) {
            callback(file);
        }
    }
};

CodeBootFileSystem.prototype.forEachEditor = function (callback) {

    var fs = this;

    fs.fem.editors.forEach(callback);
};

CodeBootFileSystem.prototype.serialize = function () {

    var fs = this;
    var json = [];
    var isUserFile = function (file) {
        return Object.prototype.hasOwnProperty.call(fs.files, file.filename);
    };

    fs.each(function (file) {
        json.push(file.serialize());
    },
    isUserFile);

    return json;
};

CodeBootFileSystem.prototype.restore = function (json) {

    var fs = this;

    fs.clear();

    for (var i = 0; i < json.length; i++) {
        var fileProps = json[i];
        var file = new CodeBootFile(fs, fileProps.filename, fileProps.content, fileProps);
        fs.addFile(file);
    }
};

CodeBootFileSystem.prototype.rebuildFileMenu = function () {

    var fs = this;

    fs.vm.forEachElem('.cb-file-selection', function (elem) {

        elem.innerHTML = ''; // remove children

        var item = fs.newMenuItem(elem, 'cb-file-new dropdown-item', 'New file');

        elem.appendChild(item);

        item.addEventListener('click', function (event) {
            fs.newFile();
        });

        fs.each(function (file) {
            fs.addFileToMenu(elem, file);
        });
    });
};

CodeBootFileSystem.prototype.newMenuItem = function (elem, cls, text) {

    var item = document.createElement('a');
    item.className = cls;
    item.href = '#';

    var span = document.createElement('span');
    span.innerText = text;

    item.appendChild(span);

    return item;
};

CodeBootFileSystem.prototype.addDividerToMenu = function (elem) {

    var item = document.createElement('div');
    item.className = 'dropdown-divider';

    elem.appendChild(item);

    return item;
};

CodeBootFileSystem.prototype.addButton = function (buttons, title, html, onClick) {

    var button = document.createElement('button');

    button.className = 'close';

    if (title) {
        button.setAttribute('data-toggle', 'tooltip');
        button.setAttribute('data-delay', '750');
        button.setAttribute('data-animation', 'false');
        button.setAttribute('data-placement', 'bottom');
        button.setAttribute('data-title', title);
    }

    button.innerHTML = html;

    button.addEventListener('click', onClick);

    buttons.appendChild(button);

    return button;
};

CodeBootFileSystem.prototype.addFileToMenu = function (elem, file) {

    var fs = this;
    var vm = fs.vm;
    var filename = file.filename;

    function dismissMenu() {
        $(elem).find($('[data-toggle="tooltip"]')).tooltip('hide');
        elem.classList.remove('show');
    }

    if (elem.childNodes && elem.childNodes.length == 1) {
        fs.addDividerToMenu(elem);
    }

    var item = fs.newMenuItem(elem, 'dropdown-item', filename);

    item.setAttribute('data-cb-filename', filename);

    item.addEventListener('click', function (event) {
        event.stopPropagation();
        dismissMenu();
        file.fe.edit();
    });

    var buttons = document.createElement('span');
    buttons.className = 'cb-file-buttons';

    if (!fs.isBuiltin(file)) {
        fs.addButton(buttons,
                     'Delete file',
                     vm.SVG['trash'],
                     function (event) {
                         event.stopPropagation();
                         dismissMenu();
                         file.delete();
                     });
    }

    fs.addButton(buttons,
                 'Download file',
                 vm.SVG['download'],
                 function (event) {
                     event.stopPropagation();
                     dismissMenu();
                     file.download();
                 });

    fs.addButton(buttons,
                 'Email file',
                 vm.SVG['mail'],
                 function (event) {
                     event.stopPropagation();
                     dismissMenu();
                     file.email();
                 });

    fs.addButton(buttons,
                 'Copy to clipboard',
                 vm.SVG['clipboard'],
                 function (event) {
                     event.stopPropagation();
                     dismissMenu();
                     file.copyToClipboard();
                 });

    item.append(buttons);

    var nodes = elem.childNodes;

    for (var i=2; i<nodes.length; i++) {
        var e = nodes[i];
        if (filename < e.getAttribute('data-cb-filename')) {
            elem.insertBefore(item, e);
            return;
        }
    }

    elem.appendChild(item);

    $(elem).find($('[data-toggle="tooltip"]')).tooltip();
};

CodeBootFile.prototype.delete = function () {
    var file = this;
    var filename = file.filename;
    if (confirm('Delete file "' + filename + '"? This cannot be undone.')) {
        var fs = file.fs;
        file.fe.disable();
        fs.deleteFile(file);
        fs.rebuildFileMenu();
    }
};

CodeBootFile.prototype.download = function () {

    var file = this;
    var filename = file.filename;
    var content = file.getContent();

    download(content, filename, "text/plain");
/*deprecated
    var elem = document.createElement('a');
    elem.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    elem.setAttribute('download', filename);

    elem.style.display = 'none';
    document.body.appendChild(elem);

    elem.click();

    document.body.removeChild(elem);
*/
};

CodeBootFile.prototype.email = function () {
    var file = this;
    var filename = file.filename;
    var content = file.getContent();
    var url = ''; //editor_URL(content, filename) + '\n\n\n';
    var subject = encodeURIComponent(filename);
    var body = encodeURIComponent(url+content);
    var href = 'mailto:?subject=' + subject + '&body=' + body;
    var w = window.open(href, '_blank');
    if (w) w.close();
};

CodeBootVM.prototype.copyTextToClipboard = function (text) {

    var vm = this;

    var textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
};

CodeBootFile.prototype.copyToClipboard = function () {

    var file = this;
    var filename = file.filename;
    var richText = file.toRichText();
    var content = file.getContent();

    function handler(event) {
        if (richText) event.clipboardData.setData('text/html', richText);
        event.clipboardData.setData('text/plain', content);
        event.preventDefault();
  }

    document.addEventListener('copy', handler);
    document.execCommand('copy');
    document.removeEventListener('copy', handler);
};

CodeBootFile.prototype.toRichText = function () {

    var file = this;
    var fe = file.fe;
    var editor = fe.editor;

    if (fe.editor === null) {
        return null;
/*
        var content = file.getContent();
        return '<pre>' + escape_HTML(content) + '</pre>';
*/
    } else {

        var styles = ['text-transform', 'color', 'font-weight'];
        var richText = '<pre style="font-family: \'Lucida Console\', \'Hack\', Monaco, monospace; font-size: 18px;">';

        for (var i=0; i<editor.lineCount(); i++) {
            var lineTokens = editor.getLineTokens(i, true);
            for (var j=0; j<lineTokens.length; j++) {
                var t = lineTokens[j];
                var token = escape_HTML(t.string);
                var tokenType = t.type;
                if (tokenType) {

                    var elem = document.querySelectorAll('.cm-'+tokenType);
                    var css = '';
                    var compStyle = window.getComputedStyle(elem[0], null);

                    styles.forEach(function (style) {
                        css += style + ':' + compStyle.getPropertyValue(style) + ';';
                    });

                    richText += '<span style="' + css + '">';
                } else {
                    richText += '<span>';
                }
                richText += token + '</span>';
            }
            richText += '\n';
        }
        richText += '</pre>';

        return richText;
    }
};

CodeBootFileSystem.prototype.openFile = function (fileOrFilename) {

    var fs = this;
    var file = fs._asFile(fileOrFilename);

    file.fe.edit();
};

CodeBootFileSystem.prototype.createFile = function (filename, content, opts) {

    var fs = this;

    if (filename === undefined) {
        filename = fs.generateUniqueFilename();
    }

    var file = new CodeBootFile(fs, filename, content, opts);

    fs.addFile(file);
    fs.rebuildFileMenu();

    return file;
};

CodeBootFileSystem.prototype.newFile = function (filename, content, opts) {

    var fs = this;

    var file = fs.createFile(filename, content, opts);

    file.fe.edit();

    return file;
};

CodeBootFileSystem.prototype.openFileExistingOrNew = function (filename) {

    var fs = this;

    if (fs.hasFile(filename)) {
        fs.openFile(filename);
        return true;
    } else {
        fs.newFile(filename);
        return false;
    }
};

CodeBootFileSystem.prototype.removeAllEditors = function () {
    var fs = this;
    fs.fem.removeAllEditors();
};

//-----------------------------------------------------------------------------

function CodeBootFileEditorManager(fs) {

    var fem = this;

    fs.fem = fem;
    fem.fs = fs;
    fem.editors = [];
    fem.activated = -1;
}

CodeBootFileEditorManager.prototype.currentlyActivated = function () {

    var fem = this;

    return fem.activated >= 0 ? fem.editors[fem.activated] : null;

};

CodeBootFileEditorManager.prototype.isActivated = function (fe) {

    var fem = this;

    return fem.currentlyActivated() === fe;

};

CodeBootFileEditorManager.prototype.indexOf = function (fe) {

    var fem = this;

    for (var i=fem.editors.length-1; i>=0; i--) {
        if (fem.editors[i] === fe) {
            return i;
        }
    }
    return -1;
};

CodeBootFileEditorManager.prototype.activate = function (fe) {

    var fem = this;

    if (fe.isActivated()) return; // already activated

    fem.fs.vm.ui.execPointBubble.destroy();

    var i = fem.indexOf(fe);

    if (i < 0) return; // not a valid editor

    if (fem.activated >= 0) {
        // deactivate currently activated editor
        fem.editors[fem.activated].deactivatePresentation();
    }

    fe.activatePresentation(); // activate editor

    fem.activated = i; // remember it is activated

    fe.focus();
};

CodeBootFileEditorManager.prototype.add = function (fe) {

    var fem = this;

    fem.editors.push(fe);

    if (fem.activated < 0) {
        fem.show(); // show editors
        fe.activate(); // activate editor
    }
};

CodeBootFileEditorManager.prototype.setReadOnlyAllEditors = function (readOnly) {

    var fem = this;

    for (var i=0; i<fem.editors.length; i++) {
        fem.editors[i].setReadOnly(readOnly);
    }
};

CodeBootFileEditorManager.prototype.removeAllEditors = function () {

    var fem = this;

    while (fem.editors.length > 0) {
        fem.remove(fem.editors[fem.editors.length-1]);
    }
};

CodeBootFileEditorManager.prototype.remove = function (fe) {

    var fem = this;
    var i = fem.indexOf(fe);

    if (i < 0) return; // not a valid editor

    fe.file.save();

    fe.removePresentation();

    fe.fileTab = null;
    fe.fileTabLabel = null;
    fe.fileTabCloseButton = null;
    fe.fileContainer = null;
    fe.editor = null;
    fe.fileTabClickHandler = null;
    fe.fileTabDblClickHandler = null;
    fe.fileTabCloseHandler = null;

    fem.editors.splice(i, 1); // remove from editors

    if (i === fem.activated) {
        fem.activated = -1;
        // need to activate some other editor
        if (i < fem.editors.length) {
            fem.editors[i].activate();
        } else if (i > 0) {
            fem.editors[i-1].activate();
        } else {
            // no other editor to activate
            fem.hide();
            fem.fs.vm.replFocus();
        }
    } else if (i < fem.activated) {
        fem.activated--;
    }
};

CodeBootFileEditorManager.prototype.show = function () {

    var fem = this;

//    fem.fs.vm.withElem('.cb-editors', function (elem) {
//        elem.style.display = 'flex';
//    });
};

CodeBootFileEditorManager.prototype.hide = function () {

    var fem = this;

//    fem.fs.vm.withElem('.cb-editors', function (elem) {
//        elem.style.display = 'none';
//    });
};

//-----------------------------------------------------------------------------

function CodeBootFileEditor(file) {

    var fe = this;

    fe.file = file;
    fe.fileTab = null;
    fe.fileTabLabel = null;
    fe.fileTabCloseButton = null;
    fe.fileContainer = null;
    fe.editor = null;
    fe.fileTabClickHandler = null;
    fe.fileTabDblClickHandler = null;
    fe.fileTabCloseHandler = null;
    file.fe = fe;
}

CodeBootFileEditor.prototype.isActivated = function () {

    var fe = this;
    var fs = fe.file.fs;

    return fs.fem.isActivated(fe);
};

CodeBootFileEditor.prototype.activate = function () {

    var fe = this;
    var fs = fe.file.fs;

    fs.fem.activate(fe);
};

CodeBootFileEditor.prototype.activatePresentation = function () {

    var fe = this;

    fe.fileTab.classList.add('active');
    fe.fileContainer.style.display = 'inline';
    fe.editor.refresh();
};

CodeBootFileEditor.prototype.deactivatePresentation = function () {

    var fe = this;

    fe.fileTab.classList.remove('active');
    fe.fileContainer.style.display = 'none';
};

CodeBootFileEditor.prototype.removePresentation = function () {

    var fe = this;
    var vm = fe.file.fs.vm;

    // remove file tab and file container

    vm.withElem('.cb-file-tabs', function (elem) {
        elem.removeChild(fe.fileTab);
    });

    vm.withElem('.cb-editors', function (elem) {
        elem.removeChild(fe.fileContainer);
    });
};

CodeBootFileEditor.prototype.isEnabled = function () {

    var fe = this;

    return fe.editor !== null;
};

CodeBootFileEditor.prototype.getValue = function () {

    var fe = this;

    if (fe.isEnabled()) {
        return fe.editor.getValue();
    } else {
        return '';
    }
};

CodeBootFileEditor.prototype.setValue = function (val) {

    var fe = this;

    if (fe.isEnabled()) {
        fe.editor.setValue(val);
    }
};

CodeBootFileEditor.prototype.edit = function () {

    var fe = this;

    fe.enable();
    fe.activate();
};

CodeBootFileEditor.prototype.focus = function () {

    var fe = this;

    fe.editor.focus();
    fe.file.fs.vm.trackEditorFocus(fe.editor, true);
};

CodeBootFileEditor.prototype.enable = function () {

    var fe = this;

    if (fe.isEnabled()) return; // noop if currently enabled

    var file = fe.file;
    var filename = file.filename;
    var fs = file.fs;
    var vm = fs.vm;

    // create file tab

    var fileTab = document.createElement('li');
    fileTab.className = 'cb-file-tab nav-link';

    var fileTabCloseButton =
        fs.addButton(fileTab,
                     '',
                     vm.SVG['close'],
                     function (event) { fs.fem.remove(fe); return false; });

    var fileTabLabel = document.createElement('span');
    fileTabLabel.className = 'cb-tab-label';
    fileTabLabel.innerText = filename;

    fileTab.appendChild(fileTabLabel);

    // create file container

    var fileContainer = document.createElement('div');
    fileContainer.className = 'cb-file-container';

    var textarea = document.createElement('textarea');
    textarea.className = 'cb-file-editor';

    fileContainer.appendChild(textarea);

    // add file tab and file container

    vm.withElem('.cb-file-tabs', function (elem) {
        elem.appendChild(fileTab);
    });

    vm.withElem('.cb-editors', function (elem) {
        elem.appendChild(fileContainer);
    });

    // create code editor

    var editor = fe.file.fs.vm.createCodeEditor(textarea, file);

    editor.setValue(file.content);

    if (file.cursor) {
        editor.setCursor(file.cursor);
    }

    fileContainer.addEventListener('click', function (event) {
        editor.focus();
    });

    // remember each element for quick access

    fe.fileTab = fileTab;
    fe.fileTabLabel = fileTabLabel;
    fe.fileTabCloseButton = fileTabCloseButton;
    fe.fileContainer = fileContainer;
    fe.editor = editor;

    fe.fileTabClickHandler = function (event) {
        if (fe.isEnabled()) fe.edit();
    };

    fe.fileTabDblClickHandler = function (event) {
        if (fe.isEnabled()) fe.rename();
    };

    fe.fileTabCloseHandler = function (event) {
        if (fe.isEnabled()) fe.disable();
    };

    fe.fileTabCloseButton.addEventListener('click', fe.fileTabCloseHandler);

    fe.normalTabEvents();

    file.fs.fem.add(fe);
};

// length of window (in ms) during which changes will be buffered
var SAVE_DELAY = 300;

CodeBootFileEditor.prototype.normalTabEvents = function () {

    var fe = this;

    fe.fileTab.addEventListener('click', fe.fileTabClickHandler);
    fe.fileTab.addEventListener('dblclick', fe.fileTabDblClickHandler);
    fe.fileTabCloseButton.style.display = 'inline';
};

CodeBootFileEditor.prototype.renameTabEvents = function () {

    var fe = this;

    fe.fileTab.removeEventListener('click', fe.fileTabClickHandler);
    fe.fileTab.removeEventListener('dblclick', fe.fileTabDblClickHandler);
    fe.fileTabCloseButton.style.display = 'none';
};

CodeBootFileEditor.prototype.disable = function () {

    var fe = this;

    if (!fe.isEnabled()) return; // noop if currently not enabled

    var file = fe.file;

    file.fs.fem.remove(fe);
};

CodeBootFileEditor.prototype.rename = function () {

    var fe = this;

    if (!fe.isEnabled()) return; // noop if currently not enabled

    var lastFocusedEditor = fe.file.fs.vm.lastFocusedEditor;
    fe.file.fs.vm.lastFocusedEditor = null; // allow focus to leave editor

    var oldFilename = fe.file.filename;
    var inputBox = document.createElement('input');
    inputBox.className = 'cb-rename-box';
    inputBox.value = oldFilename;

    fe.fileTabLabel.innerText = '';
    fe.fileTabLabel.appendChild(inputBox);

    function removeInputBox() {
        if (inputBox) {
            fe.fileTabLabel.removeChild(inputBox);
            inputBox = null;
        }
    }

    function resetTabTo(filename) {
        removeInputBox();
        fe.fileTabLabel.innerText = filename;
        fe.normalTabEvents();
        fe.file.fs.vm.lastFocusedEditor = lastFocusedEditor;
        fe.file.fs.vm.focusLastFocusedEditor();
    }

    function resetTabToOldFilename() {
        removeInputBox();
        resetTabTo(oldFilename);
    }

    function doneRenaming() {
        if (inputBox) {

            var newFilename = inputBox.value;

            removeInputBox();

            if (newFilename !== oldFilename) {

                if (newFilename === '') {
                    alert('Filename must not be empty');
                    resetTabToOldFilename();
                    return;
                }

                if (fe.file.fs.hasFile(newFilename)) {
                    alert('Filename must not be an existing file');
                    resetTabToOldFilename();
                    return;
                }

                fe.file.fs.renameFile(oldFilename, newFilename);
            }

            resetTabTo(newFilename);
        }

        fe.file.fs.rebuildFileMenu();
    }

    fe.renameTabEvents();

    inputBox.addEventListener('focusout', function (event) {
        doneRenaming();
    });

    inputBox.addEventListener('keydown', function (event) {
        if (event.keyCode === 27) {
            event.stopPropagation();
            resetTabToOldFilename();
        }
    });

    inputBox.addEventListener('keypress', function (event) {
        if (event.keyCode === 13) {
            event.stopPropagation();
            doneRenaming();
        }
    });

    inputBox.focus();
};

CodeBootFileEditor.prototype.setReadOnly = function (readOnly) {
    var fe = this;
    fe.editor.setOption('readOnly', readOnly);
    fe.editor.setOption('matchBrackets', !readOnly);
};

//-----------------------------------------------------------------------------

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
