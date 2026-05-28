# <Design Doc Title>

**Author:** Bryan Rodriguez 
**Status:** Draft
**Created:** 2026-05-27  
**Last Updated:**  2026-05-27 

---

# Summary

I need to create a map that holds the average distance and average drive time leaving from each origin in the origins history based on each active route 

---

# Motivation

- origin cards need data so that users can rank it based on the selected active routes
- I eventually want to incorporate a sort by and they could sorte based on that data

---

# Goals

- each origin card dynamically updates the values for avg. distance and avg. drive time based on selected routes
- when a new origin is added it displays the data correctly
- when a destination is made active or unactive the data needs to reflect that
- there needs to be a minimum of one route highlighted to display data
- keep it cheap. Merge with existing useRef object in order to mitigate how many requests I have to make
- create a home object that will hold all the data that card needs

---

# Non-Goals

- don't create new api sepcial handling
- don't make it too expensiev to run 

---

# Background / Current System

- currently there is no system for providing the data. 

```markdown
## Alternatives Considered

### Approach 1: Bounded On-Demand Synchronization (Selected Architecture)
A dedicated background hook monitors the intersection of `homeHistory` and `activeRoutes`. It fetches only missing pairs into the global `useRef` cache and updates a lightweight primitive state map to trigger card re-renders.

* **Cost Formula:** $O(\text{Origins} \times \text{Active Routes})$
* **Pros:**
  * **Absolute Financial Control:** Never pay for matrix elements the user hasn't explicitly highlighted.
  * **Temporal Locality:** Highly efficient cache accumulation. Once a route pair is fetched, toggling it off and on runs completely in-memory with zero network overhead.
  * **Bounded Scale:** Adding a brand new origin card only queries the active highlighted destinations, keeping costs predictable.
* **Cons:**
  * Requires a synchronization hook layer and a thin state variable in context to handle network latency safely.

### Approach 2: Eager Cross-Product Pre-Caching (Rejected)
`useDestinations` proactively fetches travel data for all origins to all destinations the moment a card is added. Individual cards read synchronously from the ref ledger during render.

* **Cost Formula:** $O(\text{Total Origins} \times \text{Total Destinations})$
* **Pros:**
  * **Zero State Complexity:** Eliminates extra hooks and reactive state tracking; the rendering loop is completely synchronous.
* **Cons:**
  * **The Matrix Cost Explosion:** Every added destination forces an automatic multi-element matrix charge, regardless of whether the user interacts with it.
  * **The New-Origin Penalty:** If a user builds up a large history of destinations and adds a single new origin, it triggers an immediate, unexpected billing spike for routes they may never highlight.

```