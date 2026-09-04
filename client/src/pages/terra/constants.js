export const MODES = [
  { id: 'cycling', label: 'Ride' },
  { id: 'walking', label: 'Walk' },
  { id: 'running', label: 'Run' },
  { id: 'driving', label: 'Drive' },
];

export const DEMO = {
  // QA/demo helper — enabled only via ?sim=1 or localStorage flag.
  enabled: () => {
    try {
      return (
        new URLSearchParams(window.location.search).get('sim') === '1' ||
        localStorage.getItem('gr_terra_sim') === '1'
      );
    } catch {
      return false;
    }
  },
  center: [77.4126, 23.2599], // Bhopal default used when no fix yet
  route() {
    // an organic ~4.5 km loop; feed points every ~1.4 s so a run feels real
    const pts = [];
    const [lng0, lat0] = this.center;
    const n = 96;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const ang = t * Math.PI * 2;
      const r = 0.0042 + 0.0011 * Math.sin(3 * ang + 0.6);
      const lat = lat0 + r * Math.sin(ang) + t * 0.00035;
      const lng = lng0 + r * 0.94 * Math.cos(ang) - t * 0.00022;
      pts.push({ lat, lng, ele: 495 + 14 * Math.sin(ang * 2) + 6 * Math.sin(ang * 6) });
    }
    return pts;
  },
};
