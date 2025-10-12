/**
 * Weather widget for the almanac page, modeled after /weather/nws-api.js.
 * Uses NWS api.weather.gov for latest observation, today's forecast, and alerts.
 * Location is sourced from assets/js/almanac.js constants.
 */

(function() {
  // Ensure required globals from almanac.js
  if (typeof latitude === 'undefined' || typeof longitude === 'undefined' || typeof observatory === 'undefined') {
    // Not on the almanac page or scripts not loaded; exit silently.
    return;
  }

  const locEl = document.getElementById('wx-location');
  if (!locEl) return; // Not on this page

  const forecastPageUrl = `https://forecast.weather.gov/MapClick.php?lat=${latitude}&lon=${longitude}`;
  locEl.innerHTML = `<a href="${forecastPageUrl}" target="_blank" rel="noopener noreferrer">${observatory}</a><br>`;

  const weatherEl = document.getElementById('wx-weather');
  const updatedEl = document.getElementById('wx-updated');

  async function getWeatherAndForecast() {
    try {
      // points endpoint
      const pointsUrl = `https://api.weather.gov/points/${latitude},${longitude}`;
      const pointsResp = await fetch(pointsUrl, { cache: 'no-store' });
      if (!pointsResp.ok) throw new Error('Failed to get gridpoint');
      const pointsData = await pointsResp.json();
      const obsUrl = pointsData.properties.observationStations;
      const forecastUrl = pointsData.properties.forecast;

      // nearest station
      const stationsResp = await fetch(obsUrl, { cache: 'no-store' });
      if (!stationsResp.ok) throw new Error('Failed to get stations');
      const stationsData = await stationsResp.json();
      const stationId = stationsData.features[0].properties.stationIdentifier;

      // latest observation
      const latestObsUrl = `https://api.weather.gov/stations/${stationId}/observations/latest`;
      const obsResp = await fetch(latestObsUrl, { cache: 'no-store' });
      if (!obsResp.ok) throw new Error('Failed to get observation');
      const obsData = await obsResp.json();
      const props = obsData.properties;

      // today's forecast
      let forecastHtml = '';
      try {
        const forecastResp = await fetch(forecastUrl, { cache: 'no-store' });
        if (!forecastResp.ok) throw new Error('Failed to get forecast');
        const forecastData = await forecastResp.json();
        const periods = forecastData.properties.periods;
        const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York' });
        const todayPeriod = periods.find(p => {
          const pDate = new Date(p.startTime).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
          return pDate === today && p.isDaytime;
        });
        if (todayPeriod) {
          forecastHtml = `
            <hr>
            <strong>Today's Forecast:</strong><br>
            ${todayPeriod.shortForecast}<br>
            High: ${todayPeriod.temperature}°${todayPeriod.temperatureUnit}<br>
            Wind: ${todayPeriod.windDirection} ${todayPeriod.windSpeed}<br>
            <small>${todayPeriod.detailedForecast}</small>
          `;
        } else {
          forecastHtml = '<hr><strong>Today\'s Forecast:</strong> Not available.';
        }
      } catch (e) {
        forecastHtml = '<hr><strong>Today\'s Forecast:</strong> Unable to load.';
      }

      // render weather
      weatherEl.classList.remove('loading');
      let iconHtml = '';
      if (props.icon) {
        iconHtml = `<div class="weather-icon"><img src="${props.icon}" alt="Weather icon"></div>`;
      } else {
        iconHtml = '<div class="weather-icon"></div>';
      }

      weatherEl.innerHTML = `
        <div class="weather-row d-flex align-items-center">
          ${iconHtml}
          <div class="weather-info ms-2">
            <strong>${props.textDescription || ''}</strong><br>
            Temperature: ${props.temperature?.value != null ? `${(props.temperature.value * 9 / 5 + 32).toFixed(1)} °F` : 'Not Reported'}<br>
            Wind: ${props.windDirection?.value != null ? props.windDirection.value.toFixed(0) + '°' : 'Not Reported'} @ ${props.windSpeed?.value != null ? props.windSpeed.value.toFixed(1) : 'Not Reported'} m/s<br>
            Humidity: ${props.relativeHumidity?.value != null ? props.relativeHumidity.value.toFixed(0) + '%' : 'Not Reported'}<br>
          </div>
        </div>
        ${forecastHtml}
      `;

      if (updatedEl) {
        updatedEl.innerHTML = `<small>Last updated: ${new Date(props.timestamp).toLocaleString()}</small>`;
      }
    } catch (err) {
      weatherEl.classList.remove('loading');
      weatherEl.textContent = 'Unable to load weather data.';
      if (updatedEl) updatedEl.textContent = '';
    }
  }

  async function getNWSAlerts() {
    const alertsRoot = document.getElementById('wx-alerts');
    const alertsContent = document.getElementById('wx-alerts-content');
    const alertsBadge = document.getElementById('wx-alerts-badge');
    const alertsToggleIcon = document.getElementById('wx-alerts-toggle-icon');
    if (!alertsRoot || !alertsContent || !alertsBadge) return;

    alertsContent.innerHTML = '<div class="text-muted">Loading alerts…</div>';
    alertsContent.classList.add('collapsed');
    alertsContent.style.display = 'none';

    try {
      const alertsUrl = `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`;
      const resp = await fetch(alertsUrl, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Failed to fetch alerts');
      const data = await resp.json();
      const features = data.features || [];

      if (features.length === 0) {
        alertsBadge.classList.add('d-none');
        alertsContent.innerHTML = '<div class="text-muted">No active alerts for this location.</div>';
        alertsContent.classList.add('collapsed');
        alertsContent.style.display = 'none';
        if (alertsToggleIcon) alertsToggleIcon.textContent = '▾';
        return;
      }

      alertsBadge.classList.remove('d-none');
      alertsBadge.textContent = features.length;
      if (alertsToggleIcon) alertsToggleIcon.textContent = '▾';

      const list = document.createElement('div');
      for (const f of features) {
        const p = f.properties || {};
        const severity = (p.severity || '').toLowerCase();
        const event = p.event || 'Alert';
        const headline = p.headline || '';
        const description = p.description || '';
        const instruction = p.instruction || '';
        const onset = p.onset ? new Date(p.onset).toLocaleString() : '';
        const expires = p.expires ? new Date(p.expires).toLocaleString() : '';

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert ' + (severity || '');
        alertDiv.innerHTML = `
          <strong>${event}</strong> ${headline ? '- ' + headline : ''}
          <div><small>${onset ? 'Starts: ' + onset + (expires ? ' — Expires: ' + expires : '') : (expires ? 'Expires: ' + expires : '')}</small></div>
          <div class="alert-body">${description ? '<div>' + description.replace(/\n/g, '<br>') + '</div>' : ''}
          ${instruction ? '<div><em>' + instruction.replace(/\n/g, '<br>') + '</em></div>' : ''}
          </div>
        `;

        const link = document.createElement('div');
        link.className = 'alert-link';
        const a = document.createElement('a');
        const forecastPageUrl = `https://forecast.weather.gov/MapClick.php?lat=${latitude}&lon=${longitude}`;
        a.href = forecastPageUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'More information';
        link.appendChild(a);
        alertDiv.appendChild(link);

        list.appendChild(alertDiv);
      }
      alertsContent.innerHTML = '';
      alertsContent.appendChild(list);
    } catch (err) {
      const alertsBadge = document.getElementById('wx-alerts-badge');
      if (alertsBadge) alertsBadge.classList.add('d-none');
      const alertsContent = document.getElementById('wx-alerts-content');
      if (alertsContent) {
        alertsContent.innerHTML = '<div class="text-muted">Unable to load alerts.</div>';
        alertsContent.classList.add('collapsed');
        alertsContent.style.display = 'none';
      }
      console.error('Error fetching alerts', err);
    }
  }

  function wireAlertsToggle() {
    const alertsToggle = document.getElementById('wx-alerts-toggle');
    const alertsContentEl = document.getElementById('wx-alerts-content');
    if (!alertsToggle || !alertsContentEl) return;

    function toggleAlerts(expand) {
      const expanded = typeof expand === 'boolean' ? expand : alertsContentEl.classList.contains('collapsed');
      if (expanded) {
        alertsContentEl.classList.remove('collapsed');
        alertsContentEl.style.display = '';
        alertsToggle.setAttribute('aria-expanded', 'true');
        const icon = document.getElementById('wx-alerts-toggle-icon'); if (icon) icon.textContent = '▴';
      } else {
        alertsContentEl.classList.add('collapsed');
        alertsContentEl.style.display = 'none';
        alertsToggle.setAttribute('aria-expanded', 'false');
        const icon = document.getElementById('wx-alerts-toggle-icon'); if (icon) icon.textContent = '▾';
      }
    }

    alertsToggle.addEventListener('click', () => toggleAlerts());
    alertsToggle.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        toggleAlerts();
      }
    });
  }

  // Initialize
  getWeatherAndForecast();
  getNWSAlerts();
  wireAlertsToggle();
  // Ensure collapsed by default on initial load
  const _alertsContentInit = document.getElementById('wx-alerts-content');
  const _alertsToggleInit = document.getElementById('wx-alerts-toggle');
  if (_alertsContentInit && _alertsToggleInit) {
    _alertsContentInit.classList.add('collapsed');
    _alertsContentInit.style.display = 'none';
    _alertsToggleInit.setAttribute('aria-expanded', 'false');
    const icon = document.getElementById('wx-alerts-toggle-icon'); if (icon) icon.textContent = '▾';
  }
})();
