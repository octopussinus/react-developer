/**
 * Factories build mock entities. Always take an override argument so a test can
 * pin exactly the field it cares about and let the rest be plausible:
 *
 *   build<Order>({ status: 'failed' })
 *
 * Rules that keep mock data useful rather than decorative:
 *  - Seed faker, so a run is reproducible and a snapshot does not churn.
 *  - Shape the entity from the GENERATED API type, never a hand-written one --
 *    a factory that invents a field hides the same bug a hand-written type does.
 *  - Include realistic extremes: long names, zero, negative, null where the API
 *    allows it. A factory that only makes tidy data hides every layout bug.
 */

import { faker } from '@faker-js/faker';

/** Deterministic by default; a test may reseed for a specific case. */
export function seedMocks(seed = 20260101): void {
  faker.seed(seed);
}

seedMocks();

export { faker };
