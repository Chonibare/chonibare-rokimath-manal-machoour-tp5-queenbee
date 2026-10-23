const TYPES_DE_RISQUE = new Set([
  'ESSAIMAGE',
  'AFFAIBLISSEMENT',
  'STRESS_THERMIQUE',
  'MORTALITE',
]);

export const DELAI_ESCALADE_MS = 48 * 60 * 60 * 1000;

const iso = (date) => new Date(date).toISOString();

class Levee {
  nom = 'LEVÉE';

  assigner(alerte, apicultriceId, at) {
    if (!apicultriceId) {
      throw new Error('Une apicultrice ou un apiculteur doit être indiqué.');
    }

    alerte._passer(new PriseEnCharge(), {
      type: 'AlertePriseEnCharge',
      apicultriceId,
      at: iso(at),
    });
  }

  escalader(alerte, at) {
    if (!alerte.estEnRetard(at)) {
      throw new Error('Une alerte ne peut être escaladée qu’après 48 h.');
    }

    alerte._passer(new Escaladee(), {
      type: 'AlerteEscaladée',
      at: iso(at),
    });
  }

  resoudre() {
    throw new Error('Une alerte doit être prise en charge avant sa résolution.');
  }
}

class Escaladee {
  nom = 'ESCALADÉE';

  assigner(alerte, apicultriceId, at) {
    if (!apicultriceId) {
      throw new Error('Une apicultrice ou un apiculteur doit être indiqué.');
    }

    alerte._passer(new PriseEnCharge(), {
      type: 'AlertePriseEnCharge',
      apicultriceId,
      at: iso(at),
    });
  }

  escalader() {
    throw new Error('Cette alerte est déjà escaladée.');
  }

  resoudre() {
    throw new Error('Une alerte doit être prise en charge avant sa résolution.');
  }
}

class PriseEnCharge {
  nom = 'PRISE_EN_CHARGE';

  assigner() {
    throw new Error('Cette alerte est déjà prise en charge.');
  }

  escalader() {
    throw new Error('Une alerte prise en charge ne peut pas être escaladée.');
  }

  resoudre(alerte, inspectionId, at) {
    if (!inspectionId) {
      throw new Error('Une inspection est nécessaire pour résoudre l’alerte.');
    }

    alerte._passer(new Resolue(), {
      type: 'AlerteRésolue',
      inspectionId,
      at: iso(at),
    });
  }
}

class Resolue {
  nom = 'RÉSOLUE';

  assigner() {
    throw new Error('Une alerte résolue ne peut plus être modifiée.');
  }

  escalader() {
    throw new Error('Une alerte résolue ne peut plus être modifiée.');
  }

  resoudre() {
    throw new Error('Une alerte résolue ne peut plus être modifiée.');
  }
}

export class Alerte {
  #etat = new Levee();
  #events = [];

  constructor({ id, hiveId, siteId, risque, confiance, leveeLe }) {
    Object.assign(this, {
      id,
      hiveId,
      siteId,
      risque,
      confiance,
      leveeLe: new Date(leveeLe),
    });
  }

  /** Fabrique : seul moyen de créer une alerte valide. */
  static lever({ id, hiveId, siteId, type, confiance, at }) {
    if (!TYPES_DE_RISQUE.has(type)) {
      throw new Error('Type de risque inconnu.');
    }

    if (
      typeof confiance !== 'number' ||
      !Number.isFinite(confiance) ||
      confiance < 0 ||
      confiance > 1
    ) {
      throw new Error('La confiance doit être un nombre compris entre 0 et 1.');
    }

    const alerte = new Alerte({
      id,
      hiveId,
      siteId,
      risque: type,
      confiance,
      leveeLe: at,
    });

    alerte.#events.push({
      type: 'AlerteLevée',
      alerteId: id,
      hiveId,
      siteId,
      risque: type,
      confiance,
      at: iso(at),
    });

    return alerte;
  }

  get statut() {
    return this.#etat.nom;
  }

  assigner(apicultriceId, at) {
    this.#etat.assigner(this, apicultriceId, at);
  }

  escalader(at) {
    this.#etat.escalader(this, at);
  }

  resoudre(inspectionId, at) {
    this.#etat.resoudre(this, inspectionId, at);
  }

  /** Une alerte levée depuis au moins 48 h est en retard. */
  estEnRetard(now) {
    return (
      this.#etat instanceof Levee &&
      new Date(now).getTime() - this.leveeLe.getTime() >=
        DELAI_ESCALADE_MS
    );
  }

  /** Événements produits depuis le dernier appel, consommés une seule fois. */
  pullEvents() {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  /** Change d’état et enregistre l’événement correspondant. */
  _passer(etat, event) {
    this.#etat = etat;
    this.#events.push({
      ...event,
      alerteId: this.id,
      hiveId: this.hiveId,
    });
  }
}
