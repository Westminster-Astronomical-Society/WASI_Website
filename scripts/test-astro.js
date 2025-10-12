// Simple unit tests for astro.js helpers (run with `node scripts/test-astro.js`)
// Loads the file into a VM context to keep globals clean.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const astroPath = path.resolve(__dirname, '..', 'assets', 'js', 'astro.js');
const nutationPath = path.resolve(__dirname, '..', 'assets', 'js', 'nutation.js');
const codeNutation = fs.readFileSync(nutationPath, 'utf8');
const codeAstro = fs.readFileSync(astroPath, 'utf8');

const sandbox = { console, Math, Date }; // minimal globals; globals are used by scripts
vm.createContext(sandbox);
vm.runInContext(codeNutation, sandbox, { filename: 'nutation.js' });
vm.runInContext(codeAstro, sandbox, { filename: 'astro.js' });

function assertAlmostEqual(actual, expected, eps = 1e-12, msg = '') {
  if (Number.isNaN(actual) || Math.abs(actual - expected) > eps) {
    throw new Error(`Assertion failed: ${msg} expected ${expected}, got ${actual}`);
  }
}

function testFrac() {
  const { frac } = sandbox;
  assertAlmostEqual(frac(3.7), 0.7, 1e-12, 'frac(3.7)');
  assertAlmostEqual(frac(-1.2), 0.8, 1e-12, 'frac(-1.2)');
  assertAlmostEqual(frac(0), 0, 1e-12, 'frac(0)');
}

function testFmod() {
  const { fmod } = sandbox;
  assertAlmostEqual(fmod(5, 2), 1, 1e-12, 'fmod(5,2)');
  assertAlmostEqual(fmod(-1, 2), 1, 1e-12, 'fmod(-1,2)');
  assertAlmostEqual(fmod(7, 2.5), 2, 1e-12, 'fmod(7,2.5)');
}

function testJDConversions() {
  const { JulianDateFromUnixTime, UnixTimeFromJulianDate } = sandbox;
  const t0 = Date.UTC(1970, 0, 1, 0, 0, 0, 0);
  const jd0 = JulianDateFromUnixTime(t0);
  assertAlmostEqual(jd0, 2440587.5, 1e-9, 'JD at Unix epoch');
  const back = UnixTimeFromJulianDate(jd0);
  assertAlmostEqual(back, t0, 1e-6, 'Unix from JD at epoch');
}

function jdFromUTC(y, m, d, hh = 0, mm = 0, ss = 0) {
  const { JulianDateFromUnixTime } = sandbox;
  const t = Date.UTC(y, m - 1, d, hh, mm, ss, 0);
  return JulianDateFromUnixTime(t);
}

function testNutation1980() {
  const { nutation1980 } = sandbox;
  if (typeof nutation1980 !== 'function') {
    throw new Error('nutation1980 is not defined');
  }
  // Reference values captured from current implementation (snapshot test)
  const jdJ2000 = 2451545.0; // 2000-01-01 12:00 TT ~ J2000; using JD number directly
  const nJ2000 = nutation1980(jdJ2000);
  assertAlmostEqual(nJ2000.deps, -0.000027992212383770132, 1e-12, 'nutation deps @ J2000');
  assertAlmostEqual(nJ2000.dpsi, -0.00006750247617532478, 1e-12, 'nutation dpsi @ J2000');

  const jd2020 = jdFromUTC(2020, 1, 1, 0, 0, 0);
  const n2020 = nutation1980(jd2020);
  assertAlmostEqual(n2020.deps, -0.000008277190959620286, 1e-12, 'nutation deps @ 2020-01-01');
  assertAlmostEqual(n2020.dpsi, -0.00007992787499660136, 1e-12, 'nutation dpsi @ 2020-01-01');
}

function run() {
  testFrac();
  testFmod();
  testJDConversions();
  testNutation1980();
  console.log('All astro.js tests passed.');
}

run();
