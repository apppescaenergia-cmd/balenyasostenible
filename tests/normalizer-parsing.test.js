const NormalizerService = require('../src/services/mqtt/normalizerService');

describe('parseig de topics MQTT amb namespace', () => {
  let normalizer;

  beforeEach(() => {
    normalizer = new NormalizerService();
  });

  const normalize = (topic, payload) =>
    normalizer.normalize({ topic, payload: String(payload), timestamp: Date.now() });

  test('Shelly EM amb namespace: device_id = CUPS i mètrica sense prefix', () => {
    const res = normalize(
      'shellies/balenya/shellyem/ES0031448185133001VT0F/emeter/0/power',
      218
    );

    expect(res).not.toBeNull();
    expect(res.deviceId).toBe('ES0031448185133001VT0F');
    expect(res.deviceType).toBe('SHELLY_SHELLYEM');
    expect(res.timeSeriesMetrics.some(m => m.metricName === 'emeter_0_power')).toBe(true);
    expect(res.stateMetrics.some(m => m.metricName === 'emeter_0_power')).toBe(true);
  });

  test('Bomba depuradora: device_id = Nom/CUPS', () => {
    const res = normalize(
      'shellies/balenya/BombaDepuradora/ES0031448185133001VT0F/emeter/0/total',
      400390
    );

    expect(res.deviceId).toBe('BombaDepuradora/ES0031448185133001VT0F');
    expect(res.deviceType).toBe('SHELLY_BOMBADEPURADORA');
    expect(res.timeSeriesMetrics.some((m) => m.metricName === 'emeter_0_total')).toBe(true);
  });

  test('BombaNet es classifica com SHELLY_BOMBANETEJA', () => {
    const res = normalize(
      'shellies/balenya/BombaNet/ES0031448185133001VT0F/emeter/0/power',
      '150'
    );
    expect(res.deviceId).toBe('BombaNet/ES0031448185133001VT0F');
    expect(res.deviceType).toBe('SHELLY_BOMBANETEJA');
  });

  test('nom antic balenyaem s\'assimila al mateix comptador Shelly EM', () => {
    const res = normalize(
      'shellies/balenyaem/ES9999999999999999XX00/emeter/0/total',
      '30086.13'
    );
    expect(res.deviceId).toBe('ES9999999999999999XX00');
    expect(res.deviceType).toBe('SHELLY_SHELLYEM');
  });

  test('mètriques no usades del Shelly EM queden ignorades', () => {
    const res = normalize(
      'shellies/balenya/shellyem/ES0031448185133001VT0F/emeter/0/reactive_power',
      '1966.5'
    );
    const names = [
      ...res.timeSeriesMetrics.map((m) => m.metricName),
      ...res.stateMetrics.map((m) => m.metricName)
    ];
    expect(names).not.toContain('emeter_0_reactive_power');
    expect(names).not.toContain('emeter_0_pf');
  });

  test('voltatge del Shelly EM es segueix guardant', () => {
    const res = normalize(
      'shellies/balenya/shellyem/ES0031448185133001VT0F/emeter/0/voltage',
      '239.7'
    );
    expect(res.timeSeriesMetrics.some((m) => m.metricName === 'emeter_0_voltage')).toBe(true);
  });

  test('generador: device_id = codi, ENERGY_GENERATOR, nodada ignorada', () => {
    const payload = JSON.stringify({
      voltatge: 230,
      potenciaFotovoltaica: 0,
      e_total_fotovoltaica: 179334.5,
      e_total_dia_fotovoltaica: 0,
      nodada1: 0,
      timestamp: '2026-10-11T04:23:06.720Z'
    });
    const res = normalize('balenya/Generacio-simulada', payload);

    expect(res.deviceId).toBe('giravolt');
    expect(res.deviceType).toBe('ENERGY_GENERATOR');

    const tsNames = res.timeSeriesMetrics.map((m) => m.metricName);
    expect(tsNames).toContain('e_total_fotovoltaica');
    expect(tsNames).toContain('potenciaFotovoltaica');
    expect(tsNames).not.toContain('nodada1');

    const stateNames = res.stateMetrics.map((m) => m.metricName);
    expect(stateNames).toContain('e_total_dia_fotovoltaica');
  });
});
