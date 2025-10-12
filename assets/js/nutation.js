/**
 * Nutation (IAU 1980) utilities and series implementation.
 *
 * Exposes:
 *  - fmod(x, y): floating modulo in [0, y)
 *  - frac(x): fractional part in [0, 1)
 *  - nutation1980(jd): returns { deps, dpsi } in radians
 */

/**
 * Floating-point modulo that returns a non-negative remainder in [0, y)
 * for y > 0. Useful for angle wrapping.
 *
 * @param {number} x - Dividend
 * @param {number} y - Divisor (positive)
 * @returns {number} Remainder in [0, y)
 */
function fmod(x, y) {
  if (y === 0) return NaN;
  const r = x % y;
  return (r + y) % y;
}

/**
 * Fractional part function returning a value in [0, 1).
 * Examples: frac(3.7) = 0.7, frac(-1.2) = 0.8
 *
 * @param {number} x - Input value
 * @returns {number} Fractional part in [0, 1)
 */
function frac(x) {
  return x - Math.floor(x);
}

/*
IAU 1980 Nutation from Explanatory Supplement to the Astronomical Almanac (1992)

Coefficients are in the order they are presented in the "Explanatory
Supplement to the Astronomical Almanac 1992", and the order used in NASA's SPICE
library, and IAU's SOFA.  So the order is kept as is for agreement with those
libraries.
*/

// Table 3.222.1
const coefficients_nut1980 = [
    [0, 0, 0, 0, 1, -171996.0, -174.2, 92025.0, 8.9],
    [0, 0, 0, 0, 2, 2062.0, 0.2, -895.0, 0.5],
    [-2, 0, 2, 0, 1, 46.0, 0.0, -24.0, 0.0],
    [2, 0, -2, 0, 0, 11.0, 0.0, 0.0, 0.0],
    [-2, 0, 2, 0, 2, -3.0, 0.0, 1.0, 0.0],
    [1, -1, 0, -1, 0, -3.0, 0.0, 0.0, 0.0],
    [0, -2, 2, -2, 1, -2.0, 0.0, 1.0, 0.0],
    [2, 0, -2, 0, 1, 1.0, 0.0, 0.0, 0.0],
    [0, 0, 2, -2, 2, -13187.0, -1.6, 5736.0, -3.1],
    [0, 1, 0, 0, 0, 1426.0, -3.4, 54.0, -0.1],
    [0, 1, 2, -2, 2, -517.0, 1.2, 224.0, -0.6],
    [0, -1, 2, -2, 2, 217.0, -0.5, -95.0, 0.3],
    [0, 0, 2, -2, 1, 129.0, 0.1, -70.0, 0.0],
    [2, 0, 0, -2, 0, 48.0, 0.0, 1.0, 0.0],
    [0, 0, 2, -2, 0, -22.0, 0.0, 0.0, 0.0],
    [0, 2, 0, 0, 0, 17.0, -0.1, 0.0, 0.0],
    [0, 1, 0, 0, 1, -15.0, 0.0, 9.0, 0.0],
    [0, 2, 2, -2, 2, -16.0, 0.1, 7.0, 0.0],
    [0, -1, 0, 0, 1, -12.0, 0.0, 6.0, 0.0],
    [-2, 0, 0, 2, 1, -6.0, 0.0, 3.0, 0.0],
    [0, -1, 2, -2, 1, -5.0, 0.0, 3.0, 0.0],
    [2, 0, 0, -2, 1, 4.0, 0.0, -2.0, 0.0],
    [0, 1, 2, -2, 1, 4.0, 0.0, -2.0, 0.0],
    [1, 0, 0, -1, 0, -4.0, 0.0, 0.0, 0.0],
    [2, 1, 0, -2, 0, 1.0, 0.0, 0.0, 0.0],
    [0, 0, -2, 2, 1, 1.0, 0.0, 0.0, 0.0],
    [0, 1, -2, 2, 0, -1.0, 0.0, 0.0, 0.0],
    [0, 1, 0, 0, 2, 1.0, 0.0, 0.0, 0.0],
    [-1, 0, 0, 1, 1, 1.0, 0.0, 0.0, 0.0],
    [0, 1, 2, -2, 0, -1.0, 0.0, 0.0, 0.0],
    [0, 0, 2, 0, 2, -2274.0, -0.2, 977.0, -0.5],
    [1, 0, 0, 0, 0, 712.0, 0.1, -7.0, 0.0],
    [0, 0, 2, 0, 1, -386.0, -0.4, 200.0, 0.0],
    [1, 0, 2, 0, 2, -301.0, 0.0, 129.0, -0.1],
    [1, 0, 0, -2, 0, -158.0, 0.0, -1.0, 0.0],
    [-1, 0, 2, 0, 2, 123.0, 0.0, -53.0, 0.0],
    [0, 0, 0, 2, 0, 63.0, 0.0, -2.0, 0.0],
    [1, 0, 0, 0, 1, 63.0, 0.1, -33.0, 0.0],
    [-1, 0, 0, 0, 1, -58.0, -0.1, 32.0, 0.0],
    [-1, 0, 2, 2, 2, -59.0, 0.0, 26.0, 0.0],
    [1, 0, 2, 0, 1, -51.0, 0.0, 27.0, 0.0],
    [0, 0, 2, 2, 2, -38.0, 0.0, 16.0, 0.0],
    [2, 0, 0, 0, 0, 29.0, 0.0, -1.0, 0.0],
    [1, 0, 2, -2, 2, 29.0, 0.0, -12.0, 0.0],
    [2, 0, 2, 0, 2, -31.0, 0.0, 13.0, 0.0],
    [0, 0, 2, 0, 0, 26.0, 0.0, -1.0, 0.0],
    [-1, 0, 2, 0, 1, 21.0, 0.0, -10.0, 0.0],
    [-1, 0, 0, 2, 1, 16.0, 0.0, -8.0, 0.0],
    [1, 0, 0, -2, 1, -13.0, 0.0, 7.0, 0.0],
    [-1, 0, 2, 2, 1, -10.0, 0.0, 5.0, 0.0],
    [1, 1, 0, -2, 0, -7.0, 0.0, 0.0, 0.0],
    [0, 1, 2, 0, 2, 7.0, 0.0, -3.0, 0.0],
    [0, -1, 2, 0, 2, -7.0, 0.0, 3.0, 0.0],
    [1, 0, 2, 2, 2, -8.0, 0.0, 3.0, 0.0],
    [1, 0, 0, 2, 0, 6.0, 0.0, 0.0, 0.0],
    [2, 0, 2, -2, 2, 6.0, 0.0, -3.0, 0.0],
    [0, 0, 0, 2, 1, -6.0, 0.0, 3.0, 0.0],
    [0, 0, 2, 2, 1, -7.0, 0.0, 3.0, 0.0],
    [1, 0, 2, -2, 1, 6.0, 0.0, -3.0, 0.0],
    [0, 0, 0, -2, 1, -5.0, 0.0, 3.0, 0.0],
    [1, -1, 0, 0, 0, 5.0, 0.0, 0.0, 0.0],
    [2, 0, 2, 0, 1, -5.0, 0.0, 3.0, 0.0],
    [0, 1, 0, -2, 0, -4.0, 0.0, 0.0, 0.0],
    [1, 0, -2, 0, 0, 4.0, 0.0, 0.0, 0.0],
    [0, 0, 0, 1, 0, -4.0, 0.0, 0.0, 0.0],
    [1, 1, 0, 0, 0, -3.0, 0.0, 0.0, 0.0],
    [1, 0, 2, 0, 0, 3.0, 0.0, 0.0, 0.0],
    [1, -1, 2, 0, 2, -3.0, 0.0, 1.0, 0.0],
    [-1, -1, 2, 2, 2, -3.0, 0.0, 1.0, 0.0],
    [-2, 0, 0, 0, 1, -2.0, 0.0, 1.0, 0.0],
    [3, 0, 2, 0, 2, -3.0, 0.0, 1.0, 0.0],
    [0, -1, 2, 2, 2, -3.0, 0.0, 1.0, 0.0],
    [1, 1, 2, 0, 2, 2.0, 0.0, -1.0, 0.0],
    [-1, 0, 2, -2, 1, -2.0, 0.0, 1.0, 0.0],
    [2, 0, 0, 0, 1, 2.0, 0.0, -1.0, 0.0],
    [1, 0, 0, 0, 2, -2.0, 0.0, 1.0, 0.0],
    [3, 0, 0, 0, 0, 2.0, 0.0, 0.0, 0.0],
    [0, 0, 2, 1, 2, 2.0, 0.0, -1.0, 0.0],
    [-1, 0, 0, 0, 2, 1.0, 0.0, -1.0, 0.0],
    [1, 0, 0, -4, 0, -1.0, 0.0, 0.0, 0.0],
    [-2, 0, 2, 2, 2, 1.0, 0.0, -1.0, 0.0],
    [-1, 0, 2, 4, 2, -2.0, 0.0, 1.0, 0.0],
    [2, 0, 0, -4, 0, -1.0, 0.0, 0.0, 0.0],
    [1, 1, 2, -2, 2, 1.0, 0.0, -1.0, 0.0],
    [1, 0, 2, 2, 1, -1.0, 0.0, 1.0, 0.0],
    [-2, 0, 2, 4, 2, -1.0, 0.0, 1.0, 0.0],
    [-1, 0, 4, 0, 2, 1.0, 0.0, 0.0, 0.0],
    [1, -1, 0, -2, 0, 1.0, 0.0, 0.0, 0.0],
    [2, 0, 2, -2, 1, 1.0, 0.0, -1.0, 0.0],
    [2, 0, 2, 2, 2, -1.0, 0.0, 0.0, 0.0],
    [1, 0, 0, 2, 1, -1.0, 0.0, 0.0, 0.0],
    [0, 0, 4, -2, 2, 1.0, 0.0, 0.0, 0.0],
    [3, 0, 2, -2, 2, 1.0, 0.0, 0.0, 0.0],
    [1, 0, 2, -2, 0, -1.0, 0.0, 0.0, 0.0],
    [0, 1, 2, 0, 1, 1.0, 0.0, 0.0, 0.0],
    [-1, -1, 0, 2, 1, 1.0, 0.0, 0.0, 0.0],
    [0, 0, -2, 0, 1, -1.0, 0.0, 0.0, 0.0],
    [0, 0, 2, -1, 2, -1.0, 0.0, 0.0, 0.0],
    [0, 1, 0, 2, 0, -1.0, 0.0, 0.0, 0.0],
    [1, 0, -2, -2, 0, -1.0, 0.0, 0.0, 0.0],
    [0, -1, 2, 0, 1, -1.0, 0.0, 0.0, 0.0],
    [1, 1, 0, -2, 1, -1.0, 0.0, 0.0, 0.0],
    [1, 0, -2, 2, 0, -1.0, 0.0, 0.0, 0.0],
    [2, 0, 0, 2, 0, 1.0, 0.0, 0.0, 0.0],
    [0, 0, 2, 4, 2, -1.0, 0.0, 0.0, 0.0],
    [0, 1, 0, 1, 0, 1.0, 0.0, 0.0, 0.0],
];

/**
 * Compute nutation in obliquity (deps) and nutation in longitude (dpsi)
 * following the IAU 1980 nutation model (Explanatory Supplement / Table 3.222).
 *
 * Implementation notes:
 * - The coefficient table `coefficients_nut1980` contains rows with the form:
 *   [a, b, c, d, e, dpsi_coeff, dpsi_t_coeff, deps_coeff, deps_t_coeff]
 *   where the first five integers are integer multipliers for the fundamental
 *   arguments (l, l', F, D, Ω) and the remaining four values are the numeric
 *   coefficients for the series.
 * - The numeric coefficients (dpsi_coeff, dpsi_t_coeff, deps_coeff, deps_t_coeff)
 *   are given in units of 0.0001 arcseconds (i.e. 1 unit = 1e-4 arcsec) in the
 *   source table. The code converts them to radians by multiplying by `as2r`
 *   (arcsec -> radians) and dividing by 10000.
 * - This function returns an object { deps, dpsi } where both values are in radians.
 *
 * Limitations / accuracy:
 * - This is the IAU 1980 series (sufficient for many applications). For higher
 *   accuracy over wide date ranges, use IAU 2000/2006 models (SOFA/IAU libraries).
 * - The algorithm uses a truncated series (the table included here) consistent
 *   with the Explanatory Supplement and common implementations (SPICE, SOFA).
 *
 * Reference:
 * - Explanatory Supplement to the Astronomical Almanac (1992), Table 3.222.1/2
 * - IERS Conventions / IAU 1980 nutation model
 *
 * @param {number} jd - Julian Date
 * @returns {{deps: number, dpsi: number}} Object with { deps, dpsi } in radians
 */
function nutation1980(jd) {
  const t = (jd - 2451545.0) / 36525.0;

  const twoPI = 2 * Math.PI;
  const as2r = ((1.0 / 3600.0) * Math.PI) / 180.0; // arcsec -> radians

  // Table 3.222.2: fundamental (mean) arguments, in radians.
  const l = fmod((485866.733 + (715922.633 + (31.310 + 0.064 * t) * t) * t) * as2r + frac(1325.0 * t) * twoPI, twoPI);
  const lp = fmod((1287099.804 + (1292581.224 + (-0.577 - 0.012 * t) * t) * t) * as2r + frac(99.0 * t) * twoPI, twoPI);
  const F = fmod((335778.877 + (295263.137 + (-13.257 + 0.011 * t) * t) * t) * as2r + frac(1342.0 * t) * twoPI, twoPI);
  const D = fmod((1072261.307 + (1105601.328 + (-6.891 + 0.019 * t) * t) * t) * as2r + frac(1236.0 * t) * twoPI, twoPI);
  const O = fmod((450160.280 + (-482890.539 + (7.455 + 0.008 * t) * t) * t) * as2r + frac(-5.0 * t) * twoPI, twoPI);

  let deps = 0.0;
  let dpsi = 0.0;

  // Eq. 3.222-6: accumulate contributions from each term in the table.
  for (let i = coefficients_nut1980.length - 1; i >= 0; i--) {
    const sumargs =
      coefficients_nut1980[i][0] * l +
      coefficients_nut1980[i][1] * lp +
      coefficients_nut1980[i][2] * F +
      coefficients_nut1980[i][3] * D +
      coefficients_nut1980[i][4] * O;

    // coefficients_nut1980[i][7] and [8] contribute to deps (obliquity)
    // coefficients_nut1980[i][5] and [6] contribute to dpsi (longitude)
    deps += Math.cos(sumargs) * (coefficients_nut1980[i][7] + coefficients_nut1980[i][8] * t);
    dpsi += Math.sin(sumargs) * (coefficients_nut1980[i][5] + coefficients_nut1980[i][6] * t);
  }

  // Convert from 0.0001 arcseconds to radians: multiply by arcsec->rad then divide by 10000
  deps = (deps * as2r) / 10000;
  dpsi = (dpsi * as2r) / 10000;
  return { deps: deps, dpsi: dpsi };
}
