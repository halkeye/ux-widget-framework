
import * as fs from '../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../src/reflector/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror } from '../src/reflector/Reflector';

describe('TSDoc Reflector, PoC types', () => {

    let jsonSource = '';
    let jsonObj: any = {};

    const allModules = [
        'Extensions',
        'PipelineGraph',
        'PipelineGraphLayout',
        'PipelineGraphModel',
        'index',
        'support/SVG',
        'support/StatusIndicator',
        'support/SvgSpinner',
        'support/SvgStatus',
        'support/TruncatingLabel',
    ];

    beforeAll(async () => {
        return fs.readFile(__dirname + '/types-sample.json', 'UTF8')
            .then(contents => { jsonSource = contents });
    })

    beforeEach(() => {
        jsonObj = JSON.parse(jsonSource);
    });

    test('creation', () => {
        const reflector = typedocReflector(jsonObj);
        expect(reflector).toBeDefined();
    });

    test('module names', () => {
        const reflector = typedocReflector(jsonObj);
        const moduleNames = reflector.moduleNames;

        moduleNames.sort();

        assert(Array.isArray(moduleNames), 'moduleNames is array');
        assert.equal(moduleNames.length, 10, 'number of modules');
        assert.equal(moduleNames.join(', '), allModules.join(', '), 'Modules listed');

        for (const name of moduleNames) {
            const mirror = reflector.describeModule(name);
            assert(mirror, `can construct mirror for "${name}"`);
            assert.equal(mirror.name, name, `mirror for "${name}" has correct name`);
            assert(reflector.isModule(mirror), `mirror for "${name}" must be module`);
        }
    });

    test('findClassByName', () => {
        const reflector = typedocReflector(jsonObj);

        let matches = reflector.findClassesByName('NotAValidName');
        assert.equal(matches.length, 0, 'no matches for NotAValidName');

        matches = reflector.findClassesByName('PipelineGraph');
        assert.equal(matches.length, 1, 'One match for PipelineGraph');
        assert.equal(matches[0].name, 'PipelineGraph', 'Correct name for PipelineGraph');

        matches = reflector.findClassesByName('TruncatingLabel');
        assert.equal(matches.length, 1, 'One match for TruncatingLabel');
        assert.equal(matches[0].name, 'TruncatingLabel', 'Correct name for TruncatingLabel');

        matches = reflector.findClassesByName('RenderState');
        assert.equal(matches.length, 0, 'No matches for RenderState'); // RenderState is an enum
    });

    test('describe class PipelineGraph', () => {
        const reflector = typedocReflector(jsonObj);
        const mirror: TypeMirror = reflector.findClassesByName('PipelineGraph')[0];

        assert(mirror, 'PipelineGraph Mirror should be defined');
        assert(mirror.isComplex, 'PipelineGraph Mirror should be complex');

        if (!reflector.isInterface(mirror)) {
            throw new Error("PipelineGraph Mirror should be InterfaceMirror");
        }

        if (!reflector.isClass(mirror)) {
            throw new Error("PipelineGraph Mirror should be ClassMirror");
        }

        const propertyNames = mirror.propertyNames;
        propertyNames.sort();

        assert.equal(propertyNames.join(', '),
            'context, props, refs, state, subscriptions',
            'propertyNames');

        // TODO: Add and test an "all children names" alongside "propertynames"
    });

    test('describe property PipelineGraph.props', () => {
        const reflector = typedocReflector(jsonObj);
        const classMirror = reflector.findClassesByName('PipelineGraph')[0];
        const propMirror = classMirror.describeProperty('props');

        assert(propMirror, 'prop mirror should exist');

        assert.equal(propMirror.name, 'props', 'name should be correct');
    });

    describe('describe type of PipelineGraph.props', () => {
        let reflector: Reflector;
        let interfaceMirror;

        beforeAll(() => {
            reflector = typedocReflector(jsonObj);
            interfaceMirror = reflector.findClassesByName('PipelineGraph')[0].describeProperty('props').type;
        });

        test('Props type mirror', () => {
            assert(interfaceMirror, 'must find mirror');
            assert.equal(interfaceMirror.name, 'Props', 'type name');

            if (!reflector.isInterface(interfaceMirror)) {
                throw new Error('Props type should be interface');
            }

            const propertyNames = interfaceMirror.propertyNames;
            propertyNames.sort();

            assert.equal(propertyNames.join(', '),
                'assetURLBase, layout, onNodeClick, resourceBundle, selectedStage, stages, trafficStateChanged',
                'propertyNames');
            // TODO: Add and test an "all children names" alongside "propertynames"
        });

        function testProp(name: string, f?: (PropertyMirror, TypeMirror) => void) {
            test(name, () => {
                const propMirror: PropertyMirror = interfaceMirror.describeProperty(name);
                assert(propMirror, 'must get typeMirror');
                assert.equal(propMirror.name, name, 'must report back correct name');

                const typeMirror = propMirror.type;
                assert(typeMirror, 'should be able to find a type!');

                if (f) {
                    f(propMirror, typeMirror);
                }
            })
        }

        testProp('assetURLBase', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(propMirror.hasComment, false, 'prop has comment?');
            assert.equal(typeMirror.isComplex, false, 'type is complex?');
            assert.equal(typeMirror.isBuiltin, true, 'type is builtin?');
        });

        testProp('layout', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror.name, 'LayoutInfo', 'type name');

            if (!reflector.isTypeAlias(typeMirror)) {
                throw new Error('prop type should be type alias');
            }

            assert.equal(reflector.isTypeAlias(typeMirror), true, 'type is TypeAliasMirror');
            assert.equal(typeMirror.isComplex, false, 'type is complex?');
            assert.equal(typeMirror.isBuiltin, false, 'type is builtin?');

            const targetType = typeMirror.targetDefinition;

            if (!reflector.isInterfaceLiteral(targetType)) {
                throw new Error('targetType should be InterfaceLiteralMirror')
            }

            assert.equal(targetType.name, '__type', 'targetType should have anonymous name placeholder');

            const expectedTargetProps = [
                'connectorStrokeWidth',
                'curveRadius',
                'labelOffsetV',
                'nodeRadius',
                'nodeSpacingH',
                'nodeSpacingV',
                'parallelSpacingH',
                'smallLabelOffsetV',
                'terminalRadius',
                'ypStart'
            ];

            const targetProps = targetType.propertyNames;
            targetProps.sort();
            assert.equal(targetProps.join(', '), expectedTargetProps.join(', '), 'target type children');

            // Make sure we can at least construct reflectors for all these props
            for (const propName of expectedTargetProps) {
                const mirror = targetType.describeProperty(propName);
                assert.equal(mirror.name, propName, 'target type prop mirror name');
            }

            // TODO: Add and test an "all children names" alongside "propertynames"


        });

        testProp('onNodeClick', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            if (!reflector.isUnion(typeMirror)) {
                throw new Error('Expected a union');
            }

            assert.strictEqual(typeMirror.types[0], reflector.builtinUndefined, 'first branch should be undefined');

            const otherdef = typeMirror.types[1];

            if (!reflector.isCallable(otherdef)) {
                throw new Error('expecting a callable for otherdef');
            }

            assert.equal(otherdef.signatures.length, 1, 'should have single signature');

            const sig = otherdef.signatures[0];

            assert(sig.returnType === reflector.builtinVoid, 'otherdef returns void');

            assert.equal(sig.parameters.length, 2, 'param count');
            assert.equal(sig.parameters[0].name, 'nodeName', 'first param name');
            assert.equal(sig.parameters[1].name, 'id', 'second param name');

            assert.equal(sig.parameters[0].type, reflector.builtinString, 'first param type');
            assert.equal(sig.parameters[1].type, reflector.builtinNumber, 'second param type');
        });

        testProp('resourceBundle', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror, reflector.builtinAny, 'prop type');
        });

        testProp('selectedStage', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            if (!reflector.isInterface(typeMirror)) {
                throw new Error('type should be interface');
            }

            assert.equal(typeMirror.name, 'StageInfo', 'type name');

            const foundProps = typeMirror.propertyNames;
            foundProps.sort();

            assert.equal(foundProps.join(', '), 'children, completePercent, id, name, nextSibling, state, title, type', 'Prop names');

            const propTypes = foundProps.map(propName => typeMirror.describeProperty(propName).type);

            let propType = propTypes[0];
            if (!reflector.isExternalTypeReference(propType)) {
                throw new Error('.children should be external ref');
            }
            assert.equal(propType.name, 'Array', '.children type name');
            assert.equal(propType.typeArguments.length, 1, '.children should have 1 type arg');
            const arrayType = propType.typeArguments[0];
            assert.equal(arrayType.name, 'StageInfo', '.children type arg name');

            propType = propTypes[1];
            assert.equal(propType, reflector.builtinNumber, '.completePercent is number');

            propType = propTypes[2];
            assert.equal(propType, reflector.builtinNumber, '.id is number');

            propType = propTypes[3];
            assert.equal(propType, reflector.builtinString, '.name is string');

            propType = propTypes[4];
            assert.equal(propType.name, 'StageInfo', '.nextSibling type name');

            propType = propTypes[5];
            assert.equal(propType.name, 'Result', '.state type name');
            if (!reflector.isEnum(propType)) {
                throw new Error('.state should be enum');
            }
            const enumChildren = propType.children;
            assert.equal(enumChildren.length, 10, 'Result value count');
            assert.equal(enumChildren.map(member => member.name).join(', '),
                'aborted, failure, not_built, paused, queued, running, skipped, success, unknown, unstable',
                'enum child names');
            assert.equal(enumChildren.map(member => member.defaultValue).join(', '),
                '"aborted", "failure", "not_built", "paused", "queued", "running", "skipped", "success", "unknown", "unstable"',
                'enum child values');

            propType = propTypes[6];
            assert.equal(propType, reflector.builtinString, '.title is string');

            propType = propTypes[7];
            assert.equal(propType.name, 'StageType', '.type type name');
            if (!reflector.isTypeAlias(propType)) {
                throw new Error('.type should be alias');
            }
            propType = propType.targetDefinition;
            assert.equal(propType, reflector.builtinString, '.type aliased type should be string');
        });

        testProp('stages', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror.name, 'Array', 'stages should be Array');
            assert.equal(typeMirror.typeArguments.length, 1, 'stages should be have a type arg');
            const arrayType = typeMirror.typeArguments[0];
            assert.equal(arrayType.name, 'StageInfo', 'stages type arg name');
        });

        testProp('trafficStateChanged', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror.name, 'Signal', 'trafficStateChanged type name');
            if (!reflector.isExternalTypeReference(typeMirror)) {
                throw new Error('trafficStateChanged should be external ref');
            }

            assert.equal(typeMirror.typeArguments.length, 1, 'trafficStateChanged should have a type arg');
            const typeArg = typeMirror.typeArguments[0];
            if (!reflector.isEnum(typeArg)) {
                throw new Error('trafficStateChanged type arg should be enum');
            }
            assert.equal(typeArg.name, 'TrafficState', 'trafficStateChanged type arg');
        });

    });

    describe('module details', () => {

        let reflector: Reflector;

        beforeAll(() => {
            reflector = typedocReflector(jsonObj);
        })

        function testModule(name: string, tests: { [k: string]: (mirror: ModuleMirror) => void }) {
            describe(name, () => {
                let mirror;

                beforeAll(() => {
                    mirror = reflector.describeModule(name);
                });

                for (const testName of Object.keys(tests)) {
                    test(testName,() => {
                        tests[testName](mirror);
                    });
                }
            });
        }

        testModule('Extensions', {
            'originalName': mirror => {
                assert.equal(mirror.originalName, '/Users/josh/cloudbees/modular-ux-poc/example-widget/src/main/Extensions.ts', 'original name');
            },
            'namespaces': mirror => {
                const namespaces = mirror.namespaces;
                assert(namespaces, 'namespaces should never be null');
                assert.equal(namespaces.length, 1, 'should have one contained ns');

                // TODO: assert on the children of the namespace
            }
        });

        // TODO: describe('PipelineGraph',() => {});
        // TODO: describe('PipelineGraphLayout',() => {});
        // TODO: describe('PipelineGraphModel',() => {});
        // TODO: describe('index',() => {});
        // TODO: describe('support/SVG',() => {});
        // TODO: describe('support/StatusIndicator',() => {});
        // TODO: describe('support/SvgSpinner',() => {});
        // TODO: describe('support/SvgStatus',() => {});
        // TODO: describe('support/TruncatingLabel',() => {});

    });

    // TODO: Flags
    // TODO: Module mirror
    // TODO: Readable / writeable flags on props
    // TODO: Reflect on constructor for classes
    // TODO: Reflect on methods for interfacelikes
    // TODO: Reflect module-level funcs
    // TODO: Walk all the modules, make sure we can construct every def

    // TODO: Repeat for the self-types def, and inspect some interesting cases
    // TODO: When reflecting on self, make sure we can detect which class members are protected / private. Must work for methods and props
});