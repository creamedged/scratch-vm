const test = require('tap').test;
const path = require('path');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');
const MonitorRecord = require('../../src/engine/monitor-record');
const {Map} = require('immutable');

test('spec', t => {
    const r = new Runtime();

    t.type(Runtime, 'function');
    t.type(r, 'object');

    // Test types of cloud data managing functions
    t.type(r.hasCloudData, 'function');
    t.type(r.canAddCloudVariable, 'function');
    t.type(r.addCloudVariable, 'function');
    t.type(r.removeCloudVariable, 'function');

    t.ok(r instanceof Runtime);

    t.end();
});

test('monitorStateEquals', t => {
    const r = new Runtime();
    const id = 'xklj4#!';
    const prevMonitorState = MonitorRecord({
        id,
        opcode: 'turtle whereabouts',
        value: '25'
    });
    const newMonitorDelta = Map({
        id,
        value: String(25)
    });
    r.requestAddMonitor(prevMonitorState);
    r.requestUpdateMonitor(newMonitorDelta);

    t.equals(true, prevMonitorState === r._monitorState.get(id));
    t.equals(String(25), r._monitorState.get(id).get('value'));
    t.end();
});

test('monitorStateDoesNotEqual', t => {
    const r = new Runtime();
    const id = 'xklj4#!';
    const params = {seven: 7};
    const prevMonitorState = MonitorRecord({
        id,
        opcode: 'turtle whereabouts',
        value: '25'
    });

    // Value change
    let newMonitorDelta = Map({
        id,
        value: String(24)
    });
    r.requestAddMonitor(prevMonitorState);
    r.requestUpdateMonitor(newMonitorDelta);

    t.equals(false, prevMonitorState.equals(r._monitorState.get(id)));
    t.equals(String(24), r._monitorState.get(id).get('value'));

    // Prop change
    newMonitorDelta = Map({
        id: 'xklj4#!',
        params: params
    });
    r.requestUpdateMonitor(newMonitorDelta);

    t.equals(false, prevMonitorState.equals(r._monitorState.get(id)));
    t.equals(String(24), r._monitorState.get(id).value);
    t.equals(params, r._monitorState.get(id).params);

    t.end();
});

test('getLabelForOpcode', t => {
    const r = new Runtime();

    const fakeExtension = {
        id: 'fakeExtension',
        name: 'Fake Extension',
        blocks: [
            {
                info: {
                    opcode: 'foo',
                    json: {},
                    text: 'Foo',
                    xml: ''
                }
            },
            {
                info: {
                    opcode: 'foo_2',
                    json: {},
                    text: 'Foo 2',
                    xml: ''
                }
            }
        ]
    };

    r._blockInfo.push(fakeExtension);

    const result1 = r.getLabelForOpcode('fakeExtension_foo');
    t.type(result1.category, 'string');
    t.type(result1.label, 'string');
    t.equals(result1.label, 'Fake Extension: Foo');

    const result2 = r.getLabelForOpcode('fakeExtension_foo_2');
    t.type(result2.category, 'string');
    t.type(result2.label, 'string');
    t.equals(result2.label, 'Fake Extension: Foo 2');

    t.end();
});

test('Project loaded emits runtime event', t => {
    const vm = new VirtualMachine();
    const projectUri = path.resolve(__dirname, '../fixtures/default.sb2');
    const project = readFileToBuffer(projectUri);
    let projectLoaded = false;

    vm.runtime.addListener('PROJECT_LOADED', () => {
        projectLoaded = true;
    });

    vm.loadProject(project).then(() => {
        t.equal(projectLoaded, true, 'Project load event emitted');
        t.end();
    });
});

test('Cloud variable limit allows only 8 cloud variables', t => {
    // This is a test of just the cloud variable limit mechanism
    // The functions being tested below need to be used when
    // creating and deleting cloud variables in the runtime.

    const rt = new Runtime();

    t.equal(rt.hasCloudData(), false);

    for (let i = 0; i < 8; i++) {
        t.equal(rt.canAddCloudVariable(), true);
        rt.addCloudVariable();
        // Adding a cloud variable should change the
        // result of the hasCloudData check
        t.equal(rt.hasCloudData(), true);
    }


    // We should be at the cloud variable limit now
    t.equal(rt.canAddCloudVariable(), false);

    // Removing a cloud variable should allow the addition of exactly one more
    // when we are at the cloud variable limit
    rt.removeCloudVariable();

    t.equal(rt.canAddCloudVariable(), true);
    rt.addCloudVariable();
    t.equal(rt.canAddCloudVariable(), false);

    // Disposing of the runtime should reset the cloud variable limitations
    rt.dispose();
    t.equal(rt.hasCloudData(), false);

    for (let i = 0; i < 8; i++) {
        t.equal(rt.canAddCloudVariable(), true);
        rt.addCloudVariable();
        t.equal(rt.hasCloudData(), true);
    }

    // We should be at the cloud variable limit now
    t.equal(rt.canAddCloudVariable(), false);

    t.end();

});
