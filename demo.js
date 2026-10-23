// DÃ©monstration : deux alertes QueenBee, une traitÃ©e Ã  temps, une escaladÃ©e.
// Lancer : node seance5-comportement-ddd/queenbee-alerte/demo.js
import { AlerteService } from './application/AlerteService.js';
import { InMemoryAlerteRepository } from './adapters/InMemoryAlerteRepository.js';
import { EventBus } from './comportementaux/EventBus.js';

// Horloge simulÃ©e : on peut avancer le temps (comme le simulateur du cahier des charges)
let now = new Date('2027-03-14T08:00:00Z');
const clock = { now: () => now, avancer: heures => { now = new Date(now.getTime() + heures * 3600e3); } };
let n = 0;
const ids = { next: () => `ALR-${String(++n).padStart(3, '0')}` };

const bus = new EventBus();
for (const type of ['AlerteLevÃ©e', 'AlertePriseEnCharge', 'AlerteEscaladÃ©e', 'AlerteRÃ©solue']) {
  bus.on(type, e => console.log(`  [${e.at.slice(0, 16)}] ${type.padEnd(19)} ${e.alerteId} Â· ruche ${e.hiveId}`));
}

const service = new AlerteService({ alertes: new InMemoryAlerteRepository(), bus, clock, ids });

const a1 = await service.lever({ hiveId: 'SN-CASA-014', siteId: 'SN-CASA', type: 'ESSAIMAGE', confiance: 0.82 });
const a2 = await service.lever({ hiveId: 'CI-TAI-007', siteId: 'CI-TAI', type: 'STRESS_THERMIQUE', confiance: 0.64 });
clock.avancer(6);
await service.assigner(a1, 'APIC-31');
clock.avancer(20);
await service.resoudre(a1, 'INSP-889');
clock.avancer(30);
console.log('  Alertes escaladÃ©es :', await service.escaladerAlertesEnRetard());
try { await service.resoudre(a2, 'INSP-900'); } catch (e) { console.log('  âœ— refusÃ© :', e.message); }
await service.assigner(a2, 'APIC-12');

