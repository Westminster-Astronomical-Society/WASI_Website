
/**
 * almanac.js
 *
 * Purpose:
 * - Populate the Observatory card on the almanac page with live values.
 * - Fields updated: name, latitude, longitude, local time (24h + TZ abbrev),
 *   UTC time, Local Mean Sidereal Time (LMST) and Julian Date (JD).
 *
 * Dependencies:
 * - Requires `astro.js` to be loaded first. The following functions are used:
 *   - JulianDateFromUnixTime(unixMs)
 *   - greenwichMeanSiderealTime(jd)
 *
 * Expected DOM IDs (in `layouts/almanac/single.html`):
 * - obs-name, obs-lat, obs-lon, obs-local, obs-utc, obs-lmst, obs-jd
 *
 * Notes on timezones:
 * - `observatoryTimeZone` controls the timezone used for the "Local time" display.
 * - The code uses Intl.DateTimeFormat via `toLocaleString` with `timeZoneName: 'short'`
 *   to show the short timezone abbreviation (e.g., EST / EDT). Browsers may vary
 *   in the exact text they return for `timeZoneName`.
 */

// Location variables (change these for other locations)
const latitude = 39.647398; // positive is north
const longitude = -76.987309; // west is negative
const observatory = 'Blaine F. Roelke Memorial Observatory';
const PLANET_EVENT_ALTITUDE_DEG = -0.5667;

// Time zone used for observatory's local time (IANA tz name)
const observatoryTimeZone = 'America/New_York';

function pad(n, w = 2) {
	const s = String(Math.floor(Math.abs(n)));
	return (s.length >= w ? s : '0'.repeat(w - s.length) + s);
}

function formatHMSfromHours(hours) {
	// Convert fractional hours into H:M:S string.
	// Accepts negative values (normalizes them into the 0..24 range) which can
	// happen for sidereal time math during intermediate calculations.
	let h = Math.floor(hours);
	let mFloat = (hours - h) * 60;
	let m = Math.floor(mFloat);
	let s = Math.floor((mFloat - m) * 60);
	if (h < 0 || m < 0 || s < 0) {
		// Normalize negatives to [0,24) for sidereal time
		let totalSec = Math.round(hours * 3600);
		const daySec = 24 * 3600;
		totalSec = ((totalSec % daySec) + daySec) % daySec;
		h = Math.floor(totalSec / 3600);
		m = Math.floor((totalSec % 3600) / 60);
		s = totalSec % 60;
	}
	return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}`;
}

function formatLatLon(lat, lon) {
	// Return human-readable latitude/longitude with hemisphere suffix.
	const latHem = lat >= 0 ? 'N' : 'S';
	const lonHem = lon >= 0 ? 'E' : 'W';
	return {
		lat: `${Math.abs(lat).toFixed(5)}° ${latHem}`,
		lon: `${Math.abs(lon).toFixed(5)}° ${lonHem}`,
	};
}

function computeJD(date) {
	// Uses astro.js: JulianDateFromUnixTime
	// Input: JS Date instance
	// Output: Julian Date as floating point number
	return JulianDateFromUnixTime(date.getTime());
}


function updateObservatoryCard() {
	// Grab DOM elements by ID. If any are missing, exit silently — this lets the
	// script be included globally without causing errors on pages that don't
	// include the observatory card.
	const nameEl = document.getElementById('obs-name');
	const latEl = document.getElementById('obs-lat');
	const lonEl = document.getElementById('obs-lon');
	const localEl = document.getElementById('obs-local');
	const utcEl = document.getElementById('obs-utc');
	const lmstEl = document.getElementById('obs-lmst');
	const jdEl = document.getElementById('obs-jd');

	// If elements are missing (other pages), do nothing
	if (!nameEl || !latEl || !lonEl || !localEl || !utcEl || !lmstEl || !jdEl) return;

	const now = new Date();
	const jd = computeJD(now);
	const lmstHours = computeLMST(jd, longitude);

	const { lat, lon } = formatLatLon(latitude, longitude);

	// Populate static/location fields
	nameEl.textContent = observatory;
	latEl.textContent = lat;
	lonEl.textContent = lon;

	// Local time at observatory
	try {
		// Use Intl formatting with the observatory time zone. hour12: false ensures
		// a 24-hour time. timeZoneName: 'short' asks for an abbreviated name (EST/EDT).
		localEl.textContent = now.toLocaleString(undefined, {
			timeZone: observatoryTimeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZoneName: 'short', // e.g., EST/EDT
		});
	} catch (e) {
		// Fallback to visitor local time (still enforce 24h and show their local TZ)
		localEl.textContent = now.toLocaleString(undefined, {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZoneName: 'short',
		});
	}

	// UTC time (24-hour)
	utcEl.textContent = now.toLocaleString(undefined, {
		timeZone: 'UTC',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});

	// LMST formatted HH:MM:SS
	lmstEl.textContent = formatHMSfromHours(lmstHours) + ' (h:m:s)';

	// Julian Date to 5 decimals
	jdEl.textContent = jd.toFixed(5);
}

function startAlmanacClock() {
	// Initial update
	updateObservatoryCard();
		// Also render Sun & Twilight tables once on load
		renderSunTwilightTables();
		initializePlanets();
	// Update every second
	setInterval(updateObservatoryCard, 1000);
	// Refresh the sun/twilight tables periodically (every 10 minutes)
	setInterval(renderSunTwilightTables, 10 * 60 * 1000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', startAlmanacClock);
} else {
	startAlmanacClock();
}

/**
 * Sun/twilight tables for the Sun & Moon section
 * Uses astro.js helpers: getSunTimes and sunPosition
 *
 * Renders two groups:
 * - Today (Sunset, End Civil/Nautical/Astronomical Twilight)
 * - Tomorrow (Start Astronomical/Nautical/Civil Twilight, Sunrise)
 */
function renderSunTwilightTables() {
		const container = document.getElementById('sun-twilight-tables');
		if (!container) return;

		const now = new Date();
		const jdNow = computeJD(now);

		// Helper: RA hours -> radians, Dec degrees -> radians
		function raDecRad(jd) {
				const pos = sunPosition(jd); // [raHours, decDeg]
				const raRad = pos[0] * 15 * toRad; // hours -> degrees -> radians
				const decRad = pos[1] * toRad;     // degrees -> radians
				return { raRad, decRad };
		}

		// Build Date at 00:00:00 UTC for a given (UTC) day offset relative to now
		function baseUtcDate(dayOffset) {
				const y = now.getUTCFullYear();
				const m = now.getUTCMonth(); // 0-based
				const d = now.getUTCDate();
				return new Date(Date.UTC(y, m, d + dayOffset, 0, 0, 0, 0));
		}

		// Convert UT hours (0..24) on a given base UTC date to a local time string
		function utHoursToLocalHM(utcBaseDate, utHours, timeZone) {
				if (!isFinite(utHours)) return '—';
				const ms = Math.round(utHours * 3600 * 1000);
				const dt = new Date(utcBaseDate.getTime() + ms);
				return dt.toLocaleString(undefined, {
						timeZone,
						hour: '2-digit',
						minute: '2-digit',
						hour12: false,
				});
		}

		// Compose a header like: Tue, Oct 14, 2025 EDT (UTC-4)
		function dayHeader(date, timeZone) {
				const dateStr = date.toLocaleString(undefined, {
						timeZone,
						weekday: 'short',
						month: 'short',
						day: '2-digit',
						year: 'numeric',
				});
				// Abbreviation
				const abbr = date.toLocaleString(undefined, {
						timeZone,
						timeZoneName: 'short',
						hour: '2-digit', // needed for some browsers to emit tz name
				}).split(', ').pop();
				// Offset like GMT-4 (convert to UTC-4)
				let offset = '';
				try {
						const parts = new Intl.DateTimeFormat(undefined, {
								timeZone,
								timeZoneName: 'shortOffset',
								hour: '2-digit',
						}).formatToParts(date);
						const tzPart = parts.find(p => p.type === 'timeZoneName');
						offset = tzPart ? tzPart.value.replace('GMT', 'UTC') : '';
				} catch (e) {
						// Fallback: omit offset if shortOffset unsupported
						offset = '';
				}
				return offset ? `${dateStr} ${abbr} (${offset})` : `${dateStr} ${abbr}`;
		}

		// Compute today's evening events (using current UT day)
		const { raRad: raToday, decRad: decToday } = raDecRad(jdNow);
		const utcBaseToday = baseUtcDate(0);

		const todaySun = getSunTimes(jdNow, latitude, longitude, raToday, decToday, h0.sunRiseSet);
		const todayCivil = getSunTimes(jdNow, latitude, longitude, raToday, decToday, h0.civilTwilight);
		const todayNaut = getSunTimes(jdNow, latitude, longitude, raToday, decToday, h0.nauticalTwilight);
		const todayAstro = getSunTimes(jdNow, latitude, longitude, raToday, decToday, h0.astronomicalTwilight);

		// Compute tomorrow morning events (next UT day)
		const jdTomorrow = jdNow + 1.0;
		const { raRad: raTomorrow, decRad: decTomorrow } = raDecRad(jdTomorrow);
		const utcBaseTomorrow = baseUtcDate(1);

		const tomorrowAstro = getSunTimes(jdTomorrow, latitude, longitude, raTomorrow, decTomorrow, h0.astronomicalTwilight);
		const tomorrowNaut = getSunTimes(jdTomorrow, latitude, longitude, raTomorrow, decTomorrow, h0.nauticalTwilight);
		const tomorrowCivil = getSunTimes(jdTomorrow, latitude, longitude, raTomorrow, decTomorrow, h0.civilTwilight);
		const tomorrowSun = getSunTimes(jdTomorrow, latitude, longitude, raTomorrow, decTomorrow, h0.sunRiseSet);

		// Build HTML
		const todayHeader = dayHeader(now, observatoryTimeZone);
		const tomorrowHeader = dayHeader(new Date(now.getTime() + 24 * 3600 * 1000), observatoryTimeZone);

		const html = `
			<div class="sun-tables">
				<div class="sun-day mb-4">
					<div class="mb-2">${todayHeader}</div>
					<table class="table table-sm" style="max-width: 420px;">
						<tbody>
							<tr><td>Sunset</td><td class="text-end">${utHoursToLocalHM(utcBaseToday, todaySun[2], observatoryTimeZone)}</td></tr>
							<tr><td>End Civil Twilight</td><td class="text-end">${utHoursToLocalHM(utcBaseToday, todayCivil[2], observatoryTimeZone)}</td></tr>
							<tr><td>End Nautical Twilight</td><td class="text-end">${utHoursToLocalHM(utcBaseToday, todayNaut[2], observatoryTimeZone)}</td></tr>
							<tr><td>End Astronomical Twilight</td><td class="text-end">${utHoursToLocalHM(utcBaseToday, todayAstro[2], observatoryTimeZone)}</td></tr>
						</tbody>
					</table>
				</div>
				<div class="sun-day mb-4">
					<div class="mb-2">${tomorrowHeader}</div>
					<table class="table table-sm" style="max-width: 420px;">
						<tbody>
							<tr><td>Start Astronomical Twilight</td><td class="text-end">${utHoursToLocalHM(utcBaseTomorrow, tomorrowAstro[1], observatoryTimeZone)}</td></tr>
							<tr><td>Start Nautical Twilight</td><td class="text-end">${utHoursToLocalHM(utcBaseTomorrow, tomorrowNaut[1], observatoryTimeZone)}</td></tr>
							<tr><td>Start Civil Twilight</td><td class="text-end">${utHoursToLocalHM(utcBaseTomorrow, tomorrowCivil[1], observatoryTimeZone)}</td></tr>
							<tr><td>Sunrise</td><td class="text-end">${utHoursToLocalHM(utcBaseTomorrow, tomorrowSun[1], observatoryTimeZone)}</td></tr>
						</tbody>
					</table>
				</div>
			</div>
		`;

		container.innerHTML = html;
}

function initializePlanets() {
	const dateInput = document.getElementById('planetDatePickerDate');
	const timeInput = document.getElementById('planetDatePickerTime');
	const tableBody = document.getElementById('planetTableBody');
	if (!dateInput || !timeInput || !tableBody) return;

	const now = new Date();
	dateInput.value = [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, '0'),
		String(now.getDate()).padStart(2, '0'),
	].join('-');
	timeInput.value = [
		String(now.getHours()).padStart(2, '0'),
		String(now.getMinutes()).padStart(2, '0'),
	].join(':');

	const render = () => renderPlanetTable(getSelectedPlanetDateTime(dateInput, timeInput));
	render();
	dateInput.addEventListener('change', render);
	timeInput.addEventListener('change', render);
}

function getSelectedPlanetDateTime(dateInput, timeInput) {
	const [year, month, day] = String(dateInput.value || '').split('-').map(Number);
	const [hour, minute] = String(timeInput.value || '00:00').split(':').map(Number);
	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return new Date(NaN);
	}
	const hh = Number.isFinite(hour) ? hour : 0;
	const mm = Number.isFinite(minute) ? minute : 0;
	return new Date(year, month - 1, day, hh, mm, 0, 0);
}

function renderPlanetTable(date) {
	const planetTableBody = document.getElementById('planetTableBody');
	if (!planetTableBody || Number.isNaN(date.getTime())) return;
	try {
		if (!Array.isArray(data1800to2050) || data1800to2050.length === 0) {
			throw new Error('Planetary ephemeris data is unavailable.');
		}

		const jd = JulianDateFromUnixTime(date.getTime());
		const observerLat = latitude * toRad;
		const observerLon = longitude * toRad;
		const observerLonMeeus = -observerLon;
		const earthPos = computePlanetShort(2, jd);

		planetTableBody.innerHTML = '';

		for (let i = 0; i < data1800to2050.length; i += 1) {
			if (i === 2) continue;

			const planetPos = computePlanetShort(i, jd);
			const geocentricPos = subtractVectors(planetPos, earthPos);
			const [ra, dec] = xyzToRaDec(geocentricPos);
			const [azimuth, altitude] = raDecToAltAz(ra, dec, observerLat, observerLon, jd);
			const [transit, rise, set] = getRiseTransitSet(
				jd,
				observerLat,
				observerLonMeeus,
				ra,
				dec,
				PLANET_EVENT_ALTITUDE_DEG,
			);

			const row = planetTableBody.insertRow();
			row.innerHTML = `
				<th scope="row">${planetNames[i]}</th>
				<td>${formatRA(ra)}</td>
				<td>${formatSignedDegrees(dec * toDeg)}</td>
				<td>${formatSignedDegrees(altitude * toDeg)}</td>
				<td>${formatAzimuth(azimuth)}</td>
				<td>${formatEventTime(rise, date)}</td>
				<td>${formatEventTime(transit, date)}</td>
				<td>${formatEventTime(set, date)}</td>
			`;
		}
	} catch (error) {
		console.error('Failed to render planetary table:', error);
		planetTableBody.innerHTML =
			'<tr><td colspan="8" class="text-muted">Unable to compute planetary positions.</td></tr>';
	}
}

function subtractVectors(a, b) {
	return a.map((value, index) => value - b[index]);
}

function formatRA(radians) {
	let hours = radians * 12 / Math.PI;
	hours = ((hours % 24) + 24) % 24;
	let totalMinutes = Math.round(hours * 60);
	if (totalMinutes >= 24 * 60) totalMinutes = 0;

	const hh = Math.floor(totalMinutes / 60);
	const mm = totalMinutes % 60;
	return `${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`;
}

function formatSignedDegrees(degrees) {
	const sign = degrees < 0 ? '-' : '+';
	const totalMinutes = Math.round(Math.abs(degrees) * 60);
	const deg = Math.floor(totalMinutes / 60);
	const min = totalMinutes % 60;
	return `${sign}${String(deg).padStart(2, '0')}° ${String(min).padStart(2, '0')}'`;
}

function formatAzimuth(radians) {
	let degrees = radians * toDeg;
	degrees = ((degrees % 360) + 360) % 360;
	let totalMinutes = Math.round(degrees * 60);
	if (totalMinutes >= 360 * 60) totalMinutes = 0;

	const deg = Math.floor(totalMinutes / 60);
	const min = totalMinutes % 60;
	return `${String(deg).padStart(3, '0')}° ${String(min).padStart(2, '0')}'`;
}

function formatEventTime(hours, date) {
	if (!Number.isFinite(hours)) return '--';
	let eventDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0));
	eventDate = new Date(eventDate.getTime() + hours * 3600000);
	return eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

