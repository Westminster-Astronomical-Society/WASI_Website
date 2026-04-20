/*
Low precision planetary ephemeris from:
Seidelmann, P K, Orbital Ephemerides of the Sun, Moon, and Planets, January 2006
Explanatory Supplement to the Astronomical Almanac, Ch 8, University Science Books
*/

const data1800to2050 = [
	[[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
		[0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
	[[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
		[0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
	[[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
		[0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
	[[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
		[0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
	[[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
		[-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
	[[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
		[-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
	[[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
		[-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
	[[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
		[0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
	[[39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684],
		[-0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482]],
];

const planetNames = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function computePlanetPosition(jd, elements, rates) {
	const t = (jd - 2451545.0) / 36525;
	let semiMajorAxis = elements[0] + rates[0] * t;
	const eccentricity = elements[1] + rates[1] * t;
	let inclination = elements[2] + rates[2] * t;
	let meanLongitude = elements[3] + rates[3] * t;
	let perihelionLongitude = elements[4] + rates[4] * t;
	let ascendingNodeLongitude = elements[5] + rates[5] * t;

	let argumentOfPerihelion = perihelionLongitude - ascendingNodeLongitude;
	let meanAnomaly = meanLongitude - perihelionLongitude;
	while (meanAnomaly > 180) {
		meanAnomaly -= 360;
	}

	let eccentricAnomaly = meanAnomaly + 57.29578 * eccentricity * Math.sin(meanAnomaly * toRad);
	let deltaE = 1;
	let iterations = 0;
	while (Math.abs(deltaE) > 1e-7 && iterations < 10) {
		deltaE = solveKepler(meanAnomaly, eccentricity, eccentricAnomaly);
		eccentricAnomaly += deltaE;
		iterations += 1;
	}

	const xPrime = semiMajorAxis * (Math.cos(eccentricAnomaly * toRad) - eccentricity);
	const yPrime = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly * toRad);

	inclination *= toRad;
	argumentOfPerihelion *= toRad;
	ascendingNodeLongitude *= toRad;

	const xEcliptic =
		(Math.cos(argumentOfPerihelion) * Math.cos(ascendingNodeLongitude) -
			Math.sin(argumentOfPerihelion) * Math.sin(ascendingNodeLongitude) * Math.cos(inclination)) * xPrime +
		(-Math.sin(argumentOfPerihelion) * Math.cos(ascendingNodeLongitude) -
			Math.cos(argumentOfPerihelion) * Math.sin(ascendingNodeLongitude) * Math.cos(inclination)) * yPrime;
	const yEcliptic =
		(Math.cos(argumentOfPerihelion) * Math.sin(ascendingNodeLongitude) +
			Math.sin(argumentOfPerihelion) * Math.cos(ascendingNodeLongitude) * Math.cos(inclination)) * xPrime +
		(-Math.sin(argumentOfPerihelion) * Math.sin(ascendingNodeLongitude) +
			Math.cos(argumentOfPerihelion) * Math.cos(ascendingNodeLongitude) * Math.cos(inclination)) * yPrime;
	const zEcliptic =
		Math.sin(argumentOfPerihelion) * Math.sin(inclination) * xPrime +
		Math.cos(argumentOfPerihelion) * Math.sin(inclination) * yPrime;

	const obliquity = 23.43928 * toRad;
	return [
		xEcliptic,
		Math.cos(obliquity) * yEcliptic - Math.sin(obliquity) * zEcliptic,
		Math.sin(obliquity) * yEcliptic + Math.cos(obliquity) * zEcliptic,
	];
}

function solveKepler(meanAnomaly, eccentricity, eccentricAnomaly) {
	const deltaMeanAnomaly = meanAnomaly - (eccentricAnomaly - eccentricity / toRad * Math.sin(eccentricAnomaly * toRad));
	return deltaMeanAnomaly / (1 - eccentricity * Math.cos(eccentricAnomaly * toRad));
}

function computePlanetShort(planetIndex, jd) {
	return computePlanetPosition(jd, data1800to2050[planetIndex][0], data1800to2050[planetIndex][1]);
}