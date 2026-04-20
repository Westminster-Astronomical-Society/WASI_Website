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

function raDecToAltAz(ra, dec, lat, lon, jd_ut) {
    const gmst = greenwichMeanSiderealTime(jd_ut);
    let localSiderealTime = (gmst + lon) % (2 * Math.PI);

    let hourAngle = localSiderealTime - ra;
    if (hourAngle < 0) { hourAngle += 2 * Math.PI; }
    if (hourAngle > Math.PI) { hourAngle -= 2 * Math.PI; }

    let azimuth = Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)
    );
    const altitude = Math.asin(
        Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle)
    );

    azimuth -= Math.PI;
    if (azimuth < 0) { azimuth += 2 * Math.PI; }

    return [azimuth, altitude, localSiderealTime, hourAngle];
}

function xyzToRaDec(target) {
    const x = target[0];
    const y = target[1];
    const z = target[2];
    const radius = Math.sqrt(x * x + y * y + z * z);
    let ra = Math.atan2(y, x);
    let dec = Math.acos(z / radius);

    if (ra < 0) { ra += 2 * Math.PI; }
    dec = Math.PI * 0.5 - dec;

    return [ra, dec, radius];
}

function getRiseTransitSet(jd, lat, lonWestPositive, ra, dec, altitudeDeg) {
    const gmst = greenwichMeanSiderealTime(Math.floor(jd) + 0.5) * toDeg;
    const transit = (ra * toDeg + lonWestPositive * toDeg - gmst) / 360.0;

    const cosLatCosDec = Math.cos(lat) * Math.cos(dec);
    if (Math.abs(cosLatCosDec) < 1e-12) {
        return [constrain(transit) * 24.0, NaN, NaN];
    }

    const cosH = (Math.sin(altitudeDeg * toRad) - Math.sin(lat) * Math.sin(dec)) / cosLatCosDec;
    if (cosH < -1 || cosH > 1) {
        return [constrain(transit) * 24.0, NaN, NaN];
    }

    const hourAngle = Math.acos(cosH) * toDeg;
    const rise = transit - hourAngle / 360.0;
    const set = transit + hourAngle / 360.0;

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

// Illuminated fraction of the Moon's disc (Meeus Ch.48)
function getIlluminatedFractionOfMoon(jd) {
    const r = Math.PI / 180.0;
    const T = (jd - 2451545) / 36525.0;
    const D  = constrainAngle(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868.0   - T * T * T * T / 113065000.0) * r;
    const M  = constrainAngle(357.5291092 +  35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000.0) * r;
    const Mp = constrainAngle(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699.0    - T * T * T * T / 14712000.0) * r;
    const i  = constrainAngle(180 - D / r - 6.289 * Math.sin(Mp) + 2.1 * Math.sin(M)
        - 1.274 * Math.sin(2 * D - Mp) - 0.658 * Math.sin(2 * D)
        - 0.214 * Math.sin(2 * Mp)     - 0.11  * Math.sin(D)) * r;
    return (1 + Math.cos(i)) / 2;
}

// Geocentric RA and Dec of the Moon (Meeus Ch.47 truncated series)
// Returns { ra: radians (0..2π), dec: radians }
function moonPositionRaDec(jd) {
    const r = Math.PI / 180.0;
    const T = (jd - 2451545.0) / 36525.0;

    const Lp = constrainAngle(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841.0    - T * T * T * T / 65194000.0);
    const D  = constrainAngle(297.8501921 + 445267.1114034  * T - 0.0018819 * T * T + T * T * T / 545868.0    - T * T * T * T / 113065000.0);
    const M  = constrainAngle(357.5291092 +  35999.0502909  * T - 0.0001536 * T * T + T * T * T / 24490000.0);
    const Mp = constrainAngle(134.9633964 + 477198.8675055  * T + 0.0087414 * T * T + T * T * T / 69699.0    - T * T * T * T / 14712000.0);
    const F  = constrainAngle( 93.2720950 + 483202.0175233  * T - 0.0036539 * T * T - T * T * T / 3526000.0  + T * T * T * T / 863310000.0);
    const A1 = constrainAngle(119.75 + 131.849  * T);
    const A2 = constrainAngle( 53.09 + 479264.290 * T);
    const A3 = constrainAngle(313.45 + 481266.484 * T);
    const E  = 1.0 - 0.002516 * T - 0.0000074 * T * T;
    const E2 = E * E;

    const Dr = D * r, Mr = M * r, Mpr = Mp * r, Fr = F * r;

    // Table 47.A longitude terms [D, M, M', F, coeff_l (×10⁻⁶ deg)]
    const lonTerms = [
        [0, 0, 1, 0,  6288774], [2, 0,-1, 0,  1274027], [2, 0, 0, 0,   658314],
        [0, 0, 2, 0,   213618], [0, 1, 0, 0,  -185116], [0, 0, 0, 2,  -114332],
        [2, 0,-2, 0,    58793], [2,-1,-1, 0,    57066], [2, 0, 1, 0,    53322],
        [2,-1, 0, 0,    45758], [0, 1,-1, 0,   -40923], [1, 0, 0, 0,   -34720],
        [0, 1, 1, 0,   -30383], [2, 0, 0,-2,    15327], [0, 0, 1,-2,    10980],
        [4, 0,-1, 0,    10675], [0, 0, 3, 0,    10034], [4, 0,-2, 0,     8548],
        [2, 1,-1, 0,    -7888], [2, 1, 0, 0,    -6766], [1, 0,-1, 0,    -5163],
        [1, 1, 0, 0,     4987], [2,-1, 1, 0,     4036], [2, 0, 2, 0,     3994],
        [4, 0, 0, 0,     3861], [2, 0,-3, 0,     3665], [0, 1,-2, 0,    -2689],
        [2,-1,-2, 0,     2390], [1, 0, 1, 0,    -2348], [2,-2, 0, 0,     2236],
        [0, 1, 2, 0,    -2120], [0, 2, 0, 0,    -2069], [2,-2,-1, 0,     2048],
        [2, 0, 1,-2,    -1773], [2, 0, 0, 2,    -1595], [4,-1,-1, 0,     1215],
        [0, 0, 2, 2,    -1110], [3, 0,-1, 0,     -892], [2, 1, 1, 0,     -810],
        [4,-1,-2, 0,      759], [0, 2,-1, 0,     -713], [2, 2,-1, 0,     -700],
        [2, 1,-2, 0,      691], [2,-1, 0,-2,      596], [4, 0, 1, 0,      549],
        [0, 0, 4, 0,      537], [4,-1, 0, 0,      520], [1, 0,-2, 0,     -487],
        [2, 1, 0,-2,     -399], [0, 0, 2,-2,     -381], [1, 1, 1, 0,      351],
        [3, 0,-2, 0,     -340], [4, 0,-3, 0,      330], [2,-1, 2, 0,      327],
        [0, 2, 1, 0,     -323], [1, 1,-1, 0,      299], [2, 0, 3, 0,      294]
    ];
    // Table 47.B latitude terms [D, M, M', F, coeff_b (×10⁻⁶ deg)]
    const latTerms = [
        [0, 0, 0, 1,  5128122], [0, 0, 1, 1,   280602], [0, 0, 1,-1,   277693],
        [2, 0, 0,-1,   173237], [2, 0,-1, 1,    55413], [2, 0,-1,-1,    46271],
        [2, 0, 0, 1,    32573], [0, 0, 2, 1,    17198], [2, 0, 1,-1,     9266],
        [0, 0, 2,-1,     8822], [2,-1, 0,-1,     8216], [2, 0,-2,-1,     4324],
        [2, 0, 1, 1,     4200], [2, 1, 0,-1,    -3359], [2,-1,-1, 1,     2463],
        [2,-1, 0, 1,     2211], [2,-1,-1,-1,     2065], [0, 1,-1,-1,    -1870],
        [4, 0,-1,-1,     1828], [0, 1, 0, 1,    -1794], [0, 0, 0, 3,    -1749],
        [0, 1,-1, 1,    -1565], [1, 0, 0, 1,    -1491], [0, 1, 1, 1,    -1475],
        [0, 1, 1,-1,    -1410], [0, 1, 0,-1,    -1344], [1, 0, 0,-1,    -1335],
        [0, 0, 3, 1,     1107], [4, 0, 0,-1,     1021], [4, 0,-1, 1,      833]
    ];

    let sigmaL = 0, sigmaB = 0;
    for (const [d, m, mp, f, cl] of lonTerms) {
        let c = cl;
        if (Math.abs(m) === 1) c *= E;
        if (Math.abs(m) === 2) c *= E2;
        sigmaL += c * Math.sin(d * Dr + m * Mr + mp * Mpr + f * Fr);
    }
    for (const [d, m, mp, f, cb] of latTerms) {
        let c = cb;
        if (Math.abs(m) === 1) c *= E;
        if (Math.abs(m) === 2) c *= E2;
        sigmaB += c * Math.sin(d * Dr + m * Mr + mp * Mpr + f * Fr);
    }
    // Additive corrections (Meeus 47.6 / 47.7)
    sigmaL += 3958 * Math.sin(A1 * r) + 1962 * Math.sin((Lp - F) * r) + 318 * Math.sin(A2 * r);
    sigmaB += -2235 * Math.sin(Lp * r) + 382 * Math.sin(A3 * r)
            + 175 * Math.sin((A1 - F) * r) + 175 * Math.sin((A1 + F) * r)
            + 127 * Math.sin((Lp - Mp) * r) - 115 * Math.sin((Lp + Mp) * r);

    const lambda = (Lp + sigmaL / 1e6) * r;  // ecliptic longitude (rad)
    const beta   = (sigmaB / 1e6) * r;        // ecliptic latitude (rad)
    const eps    = (23.439291111 - 0.013004167 * T) * r; // obliquity (rad)

    // Ecliptic → equatorial
    let ra  = Math.atan2(Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps), Math.cos(lambda));
    const dec = Math.asin(Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda));
    if (ra < 0) ra += 2 * Math.PI;
    return { ra, dec };
}
