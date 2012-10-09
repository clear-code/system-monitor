var EXPORTED_SYMBOLS = ["FileUtil"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

var FileUtil = {
  PR_RDONLY      : 0x01,
  PR_WRONLY      : 0x02,
  PR_RDWR        : 0x04,
  PR_CREATE_FILE : 0x08,
  PR_APPEND      : 0x10,
  PR_TRUNCATE    : 0x20,
  PR_SYNC        : 0x40,
  PR_EXCL        : 0x80,

  DEFAULT_BUFFER_SIZE : 1024,

  or: function (aValue, aDefault) {
    return typeof aValue === "undefined" ? aDefault : aValue;
  },

  openFile: function (aPath) {
    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    file.initWithPath(aPath);

    return file;
  },

  getFile: function (aTarget) {
    let file;
    if (aTarget instanceof Ci.nsIFile) {
      file = aTarget.clone();
    } else {
      file = this.openFile(aTarget);
    }

    return file;
  },

  readFile: function (aTarget, aOptions) {
    aOptions = aOptions || {};

    let file = this.getFile(aTarget);
    if (!file.exists())
      throw new Error(file.path + " not found");

    let fileStream = Cc["@mozilla.org/network/file-input-stream;1"]
      .createInstance(Ci.nsIFileInputStream);
    fileStream.init(file,
                    this.or(aOptions.ioFlags, 1),
                    this.or(aOptions.permission, 0),
                    this.or(aOptions.behaviorFlags, false));

    let bufferSize;
    try {
      bufferSize = aOptions.bufferSize || fileStream.available();
    } catch (x) {
      bufferSize = this.DEFAULT_BUFFER_SIZE;
    }

    let converter = aOptions.converter;
    if (!converter) {
      converter = Cc["@mozilla.org/intl/converter-input-stream;1"]
        .createInstance(Ci.nsIConverterInputStream);
      converter.init(fileStream,
                     this.or(aOptions.charset, "UTF-8"),
                     bufferSize,
                     converter.DEFAULT_REPLACEMENT_CHARACTER);
    }

    let fileContent = "";
    while (true) {
      try {
        let outputReceiver = {};
        if (!converter.readString(bufferSize, outputReceiver))
          break;
        fileContent += outputReceiver.value;
      } catch (x) {
        break;
      }
    }
    fileStream.close();

    return fileContent;
  },

  writeFile: function (aTarget, aData, aOptions) {
    aOptions = aOptions || {};

    let file = this.getFile(aTarget);
    if (file.exists() && !this.or(aOptions.overwrite, true))
      throw new Error(file.path + " already exists");

    let fileStream = Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream);
    fileStream.init(file,
                    this.or(aOptions.ioFlags, 0x02 | 0x08 | 0x20),
                    this.or(aOptions.permission, 0644),
                    this.or(aOptions.behaviorFlags, false));

    let wrote = fileStream.write(aData, aData.length);
    if (wrote != aData.length)
      throw new Error("Failed to write data to " + file.path);

    fileStream.close();

    return wrote;
  }
};
