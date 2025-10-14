const toRad = Math.PI / 180.0;
const toDeg = 180.0 / Math.PI;

// Floating point modulo
function fmod(f, m) {
    return f % m;
}

// Fractional part
function frac(f) {
    return f % 1.0;
}

//Corrects values to make them between 0 and 1
function constrain(v) {
    while (v < 0) { v += 1; }
    while (v > 1) { v -= 1; }
    return v;
}

function constrainAngle(d) {
    let t = d % 360;
    if (t < 0) { t += 360; }
    return t;
}

/**
 * Convert Unix time (milliseconds since 1970-01-01T00:00:00Z) to Julian Date.
 *
 * Notes:
 * - This uses the standard epoch relation: JD(1970-01-01T00:00:00Z) = 2440587.5
 * - Not valid for dates before the Gregorian reform (Oct 15, 1582).
 *
 * @param {number} t - Unix time in milliseconds
 * @returns {number} Julian Date (floating point)
 */
function JulianDateFromUnixTime(t) {
    // Not valid for dates before Oct 15, 1582
    return (t / 86400000) + 2440587.5;
}

/**
 * Convert Julian Date to Unix time (milliseconds since 1970-01-01T00:00:00Z).
 *
 * @param {number} jd - Julian Date
 * @returns {number} Unix time in milliseconds
 */
function UnixTimeFromJulianDate(jd) {
    // Not valid for dates before Oct 15, 1582
    return (jd - 2440587.5) * 86400000;
}


/**
 * Compute the Earth Rotation Angle (ERA) for a given Julian Date.
 *
 * Source: IERS Technical Note No. 32 (equation approximations used here).
 *
 * @param {number} jd - Julian Date (UTC-like time; see note)
 * @returns {number} ERA in radians, range [0, 2π)
 */
function earthRotationAngle(jd) {

    const t = jd - 2451545.0; // days since J2000
    const f = jd % 1.0; // fractional day

    let theta = 2 * Math.PI * (f + 0.7790572732640 + 0.00273781191135448 * t); // eq 14
    theta %= 2 * Math.PI;
    if (theta < 0) theta += 2 * Math.PI;

    return theta; // ERA in radians
}

/**
 * Compute Greenwich Mean Sidereal Time (GMST) for a Julian Date.
 *
 * Uses the expression from "Expressions for IAU 2000 precession quantities"
 * (Capitaine, Wallace, Chapront). Returned value is in radians.
 *
 * @param {number} jd - Julian Date
 * @returns {number} GMST in radians, range [0, 2π)
 */
function greenwichMeanSiderealTime(jd) {
    // "Expressions for IAU 2000 precession quantities" N. Capitaine et al.
    const t = ((jd - 2451545.0)) / 36525.0;

    let gmst = earthRotationAngle(jd) + (0.014506 + 4612.156534 * t + 1.3915817 * t * t - 0.00000044 * t * t * t - 0.000029956 * t * t * t * t - 0.0000000368 * t * t * t * t * t) / 60.0 / 60.0 * Math.PI / 180.0; // eq 42
    gmst %= 2 * Math.PI;
    if (gmst < 0) gmst += 2 * Math.PI;

    return gmst; // GMST in radians
}

/**
 * Compute Greenwich Apparent Sidereal Time (GAST).
 *
 * GAST = GMST + equation of the equinoxes (via nutation).
 * This function requires a `nutation1980` function that returns an object
 * with properties `{dpsi, deps}` in radians (nutation in longitude and
 * nutation in obliquity). The implementation assumes `nutation1980` is
 * available in the global scope.
 *
 * @param {number} jd_ut - Julian Date (UT-like)
 * @param {number} jd_tt - Julian Date (Terrestrial Time) — can be same as jd_ut for approximation
 * @returns {number} GAST in radians
 */
function greenwichApparentSiderealTime(jd_ut, jd_tt) {
    const as2r = ((1.0 / 3600.0) * Math.PI) / 180.0; // arcsec to rad
    const gmst = greenwichMeanSiderealTime(jd_ut);
    // Requires nutation1980 (provided by nutation.js) loaded beforehand
    const n = nutation1980(jd_tt);
    const T = (jd_tt - 2451545.0) / 36525;
    const ε0 = 84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T; // arcsec
    const ε = ε0 * as2r + n.deps;
    const eqeq = n.dpsi * Math.cos(ε); // equation of the equinoxes
    const gast = gmst + eqeq;

    return gast; // GAST in radians
}

/**
 * Convenience wrapper to return GAST in hours.
 *
 * @param {number} jd - Julian Date
 * @returns {number} GAST in hours
 */
function computeGAST(jd) {
    // Use UTC in place of UT1 and Terrestrial Time as an approximation
    const gast = greenwichApparentSiderealTime(jd, jd) * 180 / Math.PI / 15.0;

    return gast; // GAST in hours
}

/**
 * Compute Local Mean Sidereal Time (LMST) in hours for a given longitude.
 *
 * @param {number} jd - Julian Date
 * @param {number} lonDegrees - Longitude in degrees (positive east)
 * @returns {number} LMST in hours
 */
function computeLMST(jd, lonDegrees) {
    const gmstRad = greenwichMeanSiderealTime(jd);
    let gmstHours = gmstRad * (12 / Math.PI); // 2π rad = 24h
    // Normalize to [0,24)
    gmstHours = ((gmstHours % 24) + 24) % 24;
    let lmst = gmstHours + lonDegrees / 15.0;
    lmst = ((lmst % 24) + 24) % 24;

    return lmst; // hours
}

/**
 * Compute Local Apparent Sidereal Time (LAST) in hours for a given longitude.
 *
 * @param {number} jd - Julian Date
 * @param {number} lon - Longitude in degrees (positive east)
 * @returns {number} LAST in hours
 */
function computeLAST(jd, lon) {
    const gast = computeGAST(jd);
    const last = gast + (lon / 15.0); // Convert lon to hours

    return last; // LAST in hours
}


/* 
Sunrise, sunset, and twilight times. From Meeus Page 101
Angles must be in radians, West longitudes is positive
for the Meeus algorithm.
Outputs are times in hours GMT (no DST)
 */

var h0 = {
    sunRiseSet: -0.8333,
    civilTwilight: -6,
    nauticalTwilight: -12,
    astronomicalTwilight: -18
};

function getSunTimes(jd, latitude, longitude, ra, dec, h0) {
    let lat = latitude * toRad; // in radians
    let lon = longitude * toRad * -1; // in radians, West longitudes positive

    console.log("getSunTimes", jd, lat, lon, ra, dec, h0);
    const cosH = (Math.sin(h0 * Math.PI / 180.0) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec));
    const H0 = Math.acos(cosH) * 180.0 / Math.PI;

    const gmst = greenwichMeanSiderealTime(Math.floor(jd) + .5) * toDeg;

    const transit = (ra * toDeg + lon * toDeg - gmst) / 360.0;
    const rise = transit - (H0 / 360.0);
    const set = transit + (H0 / 360.0);

    return [constrain(transit) * 24.0, constrain(rise) * 24.0, constrain(set) * 24.0];
}

// RA and Dec of the Sun
function sunPosition(jd) {
    const n = jd - 2451545.0;
    let L = (280.460 + 0.9856474 * n) % 360;
    let g = ((375.528 + .9856003 * n) % 360) * toRad;
    if (L < 0) { L += 360; }
    if (g < 0) { g += Math.PI * 2.0; }

    const lamba = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * toRad;
    const beta = 0.0;
    const eps = (23.439 - 0.0000004 * n) * toRad;
    let ra = Math.atan2(Math.cos(eps) * Math.sin(lamba), Math.cos(lamba));
    const dec = Math.asin(Math.sin(eps) * Math.sin(lamba));
    if (ra < 0) { ra += Math.PI * 2; }
    return [ra / toRad / 15.0, dec / toRad]; // ra in radians, dec in radians
}
