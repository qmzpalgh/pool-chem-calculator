# Pool Chemistry Calculator

A dependency-free, single-page calculator. Open `index.html` with `styles.css` and `calculator.js` alongside it.

## Calculator behavior

- Pool changes clear all remembered readings, so measurements from one pool cannot be used for another. Within a pool, current and target readings are remembered by parameter when switching calculations or directions.
- A custom pool requires a positive volume in litres; it does not inherit a named pool's volume or chlorine reference range.
- Both readings must be present and non-negative. Equal readings need no adjustment, and a direction mismatch shows a warning.
- pH doses are not calculated: pool volume and pH readings alone do not determine acid or base demand.
- CYA is offered at Crib Point, where the pools are outdoors; the custom option must also be an outdoor pool. Victorian guidance specifies an ideal CYA level at or below 30 mg/L and a maximum of 100 mg/L.
- Results are estimates and assume the product characteristics named in the interface. The acid result is a theoretical total, not a single dose; changing alkalinity with acid can sharply lower pH.

## Multipliers

For the supported estimates, amount = |target − current| × volume in litres × multiplier / 1,000,000. Alkalinity is measured as mg/L as CaCO₃.

| Adjustment | Product | Multiplier | Result |
| --- | --- | ---: | --- |
| Increase alkalinity | Pure sodium bicarbonate | 1.68 | kg |
| Increase free chlorine | Sodium hypochlorite, 125 g/L available chlorine | 8 | L |
| Increase CYA | Pure cyanuric acid | 1 | kg |
| Decrease alkalinity | Hydrochloric acid 33% | 2 | L, estimated total |
| Decrease free chlorine | Sodium thiosulphate | 1 | kg |

The bicarbonate factor follows the equivalent-weight ratio (84/50) and the 1.4 lb per 10,000 US gallons per 10 mg/L example in the [Arkansas pool operator dosage chart](https://healthy.arkansas.gov/wp-content/uploads/Guidelines_for_Pool_and_Spa_Operators.pdf). The older [Victorian pool operators' handbook](https://vgls.sdp.sirsidynix.net.au/client/search/asset/1266300) gives a coarser bicarbonate approximation and the thiosulphate rate used here. Check the specific product label: other published thiosulphate rates differ.

The hypochlorite factor matches the [NSW Health dosage table](https://www.health.nsw.gov.au/environment/water/Documents/chlorine-ready-reckoner-tables.pdf). The acid factor is an approximation consistent with the [Lake County operator manual](https://www.lakecountyil.gov/DocumentCenter/View/77109/LCHD---Swimming-Facility-Manual---August-26-2024) for roughly 31% acid; actual product strength and water chemistry matter. Do not treat the total as a safe single addition. The [Victorian water quality guidelines](https://www.health.vic.gov.au/sites/default/files/migrated/files/collections/policies-and-guidelines/w/water-quality-guidelines-for-public-aquatic-facilities---managing-public-health-risks---2020.pdf) give the CYA guidance. A [pool chemistry paper](https://www.poolhelp.com/wp-content/uploads/2017/05/JSPSI_V5N1_pp39-56.pdf) describes the additional information used for pH adjustments and demand tests.

Named pool volumes and chlorine reference ranges are inherited site settings; confirm them with the facility's current water quality risk management plan before relying on them.

## Browser tests

Serve the repository locally, for example with `python -m http.server 8000 --bind 127.0.0.1`, then open `http://127.0.0.1:8000/tests/calculator.html`. The test page reports each result and requires no test framework.
