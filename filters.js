var respawn = require('respawn');

var proc = respawn(['node', '--harmony', 'index.js', '-o', 'filters'], {
    env: {ENV_VAR: 'production'}, // set env vars
    cwd: '.',              // set cwd
    maxRestarts: 100,        // how many restarts are allowed within 60s
    sleep: 10000            // time to sleep between restarts
});

proc.on('spawn', function () {
    console.log('start monitoring filter application');
});

proc.on('exit', function (code, signal) {
    console.error({msg: 'process exited, code: ' + code + ' signal: ' + signal});
});

proc.on('stdout', function (data) {
    console.log(data.toString());
});

proc.on('stderr', function (data) {
    console.error({msg: 'process error', data: data.toString()});
});

proc.start();

