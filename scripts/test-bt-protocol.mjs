/**
 * Lightweight parser regression checks (no test runner required).
 * Run: node --experimental-strip-types scripts/test-bt-protocol.mjs
 * or:  npx tsx scripts/test-bt-protocol.mjs
 */
import {
  parseStatusBlock,
  statusSnippet,
} from '../src/lib/bt-protocol.ts';

let passed = 0;
let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}`, detail ?? '');
  }
}

function assertEq(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(name, ok, { actual, expected });
}

const SAMPLE = [
  'BEGIN_STATUS',
  'temperature=25.0',
  'airHumidity=60.0',
  'soilMoisture=45',
  'soilRaw=2100',
  'light=70',
  'lightRaw=2800',
  'pump=false',
  'lamp=true',
  'fan=false',
  'END_STATUS',
].join('\n');

console.log('parseStatusBlock');

assertEq('clean LF', parseStatusBlock(SAMPLE), {
  temperature: 25,
  airHumidity: 60,
  soilMoisture: 45,
  soilRaw: 2100,
  light: 70,
  lightRaw: 2800,
  pump: false,
  lamp: true,
  fan: false,
});

const crlf = SAMPLE.replace(/\n/g, '\r\n');
assertEq('CRLF', parseStatusBlock(crlf)?.soilMoisture, 45);

const chatter = `EstufaESP32 pronta\nBomba: LIGADA\n${SAMPLE}\n`;
assertEq('noise prefix (Bomba)', parseStatusBlock(chatter)?.soilMoisture, 45);
assertEq('noise keeps pump false from STATUS', parseStatusBlock(chatter)?.pump, false);

// Simulates react-native-bluetooth-classic delimiter stripping
const stripped = SAMPLE.split('\n').join('');
assertEq(
  'concatenated without newlines (delimiter strip)',
  parseStatusBlock(stripped)?.soilMoisture,
  45
);
assertEq('concat soilRaw', parseStatusBlock(stripped)?.soilRaw, 2100);

const restored = SAMPLE.split('\n').map((l) => `${l}\n`).join('');
assertEq('restored newlines like fixed BT buffer', parseStatusBlock(restored)?.soilRaw, 2100);

const aliases = [
  'BEGIN_STATUS',
  'temp=22.5',
  'umidadeAr=55',
  'umidadeSolo=33',
  'soloAdc=2500',
  'luminosidade=10',
  'ldrRaw=400',
  'bomba=true',
  'lampada=false',
  'ventoinha=true',
  'END_STATUS',
].join('\n');
assertEq('aliases soil', parseStatusBlock(aliases)?.soilMoisture, 33);
assertEq('aliases soilRaw', parseStatusBlock(aliases)?.soilRaw, 2500);
assertEq('aliases pump', parseStatusBlock(aliases)?.pump, true);

let frag = 'BEGIN_STATUS\ntemperature=1.0\nsoilMoisture=9\n';
assertEq('incomplete fragment', parseStatusBlock(frag), null);
frag += 'soilRaw=111\nairHumidity=2\nlight=3\nlightRaw=4\npump=false\nlamp=false\nfan=false\nEND_STATUS\n';
assertEq('completed after fragment', parseStatusBlock(frag)?.soilMoisture, 9);

const twoBlocks = `${SAMPLE.replace('soilMoisture=45', 'soilMoisture=10')}\n${SAMPLE}`;
assertEq('latest block wins', parseStatusBlock(twoBlocks)?.soilMoisture, 45);

assert(
  'snippet present',
  (statusSnippet(chatter) ?? '').includes('soilMoisture=45')
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
