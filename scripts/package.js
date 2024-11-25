const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const output = fs.createWriteStream(path.join(__dirname, '../jsoneditor.upx'));
const archive = archiver('zip');

output.on('close', () => {
  console.log('Plugin packaged successfully');
});

archive.pipe(output);
archive.directory('plugin/', false);
archive.finalize(); 