
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
	// Update every second
	setInterval(updateObservatoryCard, 1000);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', startAlmanacClock);
} else {
	startAlmanacClock();
}

