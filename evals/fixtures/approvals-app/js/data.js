// Mock data: people, personas and ~160 purchase requests, generated from a
// fixed seed so every visit starts from the same believable company.
// All names are fictional. The user's own decisions are saved on top of
// this by ExperienceKit.createStore (localStorage), standing in for a server.
window.Approvals = window.Approvals || {};

Approvals.data = (() => {
  const { routeFor, totals, HOUR } = Approvals.policy;

  // ---- People ---------------------------------------------------------------

  const DEPARTMENTS = [
    { id: "ops", name: "Operations", managerId: "p-daniel" },
    { id: "fac", name: "Facilities", managerId: "p-daniel" },
    { id: "log", name: "Logistics", managerId: "p-daniel" },
    { id: "it", name: "IT", managerId: "p-rahul" },
    { id: "mkt", name: "Marketing", managerId: "p-elena" },
    { id: "sales", name: "Sales", managerId: "p-marcus" },
    { id: "hr", name: "People & HR", managerId: "p-grace" },
    { id: "eng", name: "Engineering", managerId: "p-tomas" },
  ];

  const APPROVERS = [
    { id: "p-daniel", name: "Daniel Okafor", title: "Head of Operations", departmentId: "ops" },
    { id: "p-rahul", name: "Rahul Mehta", title: "Head of IT", departmentId: "it" },
    { id: "p-elena", name: "Elena Rossi", title: "Head of Marketing", departmentId: "mkt" },
    { id: "p-marcus", name: "Marcus Hale", title: "Head of Sales", departmentId: "sales" },
    { id: "p-grace", name: "Grace Mwangi", title: "Head of People", departmentId: "hr" },
    { id: "p-tomas", name: "Tomás Herrera", title: "Head of Engineering", departmentId: "eng" },
    { id: "p-amara", name: "Amara Lee", title: "Finance Controller", departmentId: "fin" },
    { id: "p-sofia", name: "Sofia Marin", title: "Director of Operations & Finance", departmentId: "exec" },
  ];

  const FIRST = ["Kenji", "Priya", "Lucas", "Hana", "Omar", "Ines", "Felix", "Zara", "Mateo", "Leah", "Arjun", "Nora", "Theo", "Maya",
    "Samir", "Chloe", "Jonas", "Aiko", "Ravi", "Sara", "Diego", "Mina", "Owen", "Lina", "Yusuf", "Elif", "Noah", "Ava", "Kofi", "Ruth"];
  const LAST = ["Watanabe", "Nair", "Brandt", "Kim", "Haddad", "Costa", "Novak", "Ahmed", "Silva", "Fischer", "Patel", "Olsen",
    "Moreau", "Chen", "Aziz", "Dubois", "Berg", "Sato", "Iyer", "Lund", "Ortega", "Park", "Reid", "Yilmaz", "Mensah", "Ward"];

  // The approval route's approver for each step.
  const FINANCE_APPROVER = "p-amara";
  const DIRECTOR_APPROVER = "p-sofia";

  const PERSONAS = [
    { key: "manager", personId: "p-daniel", role: "manager", label: "Manager", description: "Approves Operations, Facilities and Logistics" },
    { key: "finance", personId: "p-amara", role: "finance", label: "Finance", description: "Signs every request from $5,000" },
    { key: "director", personId: "p-sofia", role: "director", label: "Director", description: "Signs every request from $50,000" },
    { key: "requester", personId: "p-kenji", role: "requester", label: "Requester", description: "Facilities coordinator" },
  ];

  // ---- Catalogue: what each department buys ------------------------------

  const CATALOGUE = {
    ops: { vendors: ["Northwind Supply", "Keel & Co.", "Atlas Industrial"], items: [
      ["Hi-vis jackets, size mix", 18, 60], ["Safety boots (pairs)", 65, 40], ["Handheld barcode scanners", 420, 24],
      ["Shift scheduling licence (annual)", 3200, 3], ["First-aid station refill", 140, 10]] },
    fac: { vendors: ["Brightline Facilities", "Meridian HVAC", "Oakframe Furniture"], items: [
      ["Ergonomic task chairs", 389, 40], ["HVAC quarterly service — Building B", 4800, 2], ["Sit-stand desks", 540, 30],
      ["LED panel retrofit, 3rd floor", 95, 120], ["Meeting-room acoustic panels", 210, 36], ["Deep clean after refit", 2600, 1]] },
    log: { vendors: ["Harbour Freight Systems", "Palletline", "Crestway Forklifts"], items: [
      ["Pallet racking bays", 610, 24], ["Forklift annual service", 1850, 6], ["Stretch-wrap rolls (cases)", 74, 50],
      ["Dock leveller repair", 7400, 1], ["Courier account top-up", 2500, 4]] },
    it: { vendors: ["Corvid Systems", "Bluegate IT", "Lumen Networks"], items: [
      ["Laptops — 14\" developer spec", 1690, 30], ["27\" monitors", 329, 40], ["USB-C docks", 189, 40],
      ["Firewall licence renewal", 14800, 1], ["Wi-Fi access points", 460, 24], ["Endpoint security seats (annual)", 48, 400]] },
    mkt: { vendors: ["Studio Fieldwork", "Printhaus", "Tallgrass Events"], items: [
      ["Trade-show booth, 6×3 m", 18500, 1], ["Product brochure print run", 1.9, 6000], ["Campaign photography (days)", 2200, 4],
      ["Agency retainer — November", 9500, 1], ["Branded merchandise", 7.5, 1200]] },
    sales: { vendors: ["Pipeline Labs", "Summit Travel", "Gather & Co."], items: [
      ["CRM seats (annual)", 780, 40], ["Client workshop venue", 3400, 2], ["Sales kickoff catering", 38, 220],
      ["Demo kits", 260, 20]] },
    hr: { vendors: ["Learnwell", "Kindred Benefits", "Pathway Recruiting"], items: [
      ["Leadership course seats", 1450, 16], ["Wellbeing app (annual)", 18, 600], ["Graduate fair stand", 2900, 2],
      ["Onboarding welcome packs", 46, 120]] },
    eng: { vendors: ["Fathom Cloud", "Ridgeway Test Labs", "Quanta Components"], items: [
      ["Load-testing service (month)", 6200, 2], ["Prototype PCBs", 34, 300], ["Cloud credits — staging", 12000, 3],
      ["Oscilloscopes", 2900, 4], ["CAD licences (annual)", 2350, 8]] },
  };

  const SEND_BACK_REASONS = [
    "Please attach a second quote — policy needs two for anything over $5,000.",
    "Split this across the two cost centres it serves before I sign.",
    "The VAT on the quote doesn't match the line items. Can you check with the vendor?",
    "Add the delivery date and who will receive it on site.",
    "Can we get the volume discount the vendor offered last time? Re-quote please.",
  ];
  const REJECT_REASONS = [
    "We already have a framework contract covering this — order through it instead.",
    "Not in this quarter's budget. Raise it again in January.",
    "Duplicate of an earlier request that has already been approved.",
  ];
  const APPROVE_NOTES = ["", "", "", "Fine — within budget.", "OK. Please keep the delivery note.", "Approved, thanks for the comparison."];

  // ---- Seeded random, so the mock company is the same on every visit -------

  function seededRandom(seed) {
    let value = seed;
    return () => {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const random = seededRandom(2041);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const between = (low, high) => low + random() * (high - low);

  // ---- Staff ----------------------------------------------------------------

  function buildStaff() {
    const staff = [{ id: "p-kenji", name: "Kenji Watanabe", title: "Facilities Coordinator", departmentId: "fac" }];
    let index = 0;
    for (const department of DEPARTMENTS) {
      for (let count = 0; count < 5; count++) {
        index += 1;
        const name = `${FIRST[(index * 7) % FIRST.length]} ${LAST[(index * 11) % LAST.length]}`;
        if (name === "Kenji Watanabe") continue;
        staff.push({ id: `p-s${index}`, name, title: `${department.name} team`, departmentId: department.id });
      }
    }
    return staff;
  }

  const STAFF = buildStaff();
  const PEOPLE = new Map([...APPROVERS, ...STAFF].map((person) => [person.id, person]));

  // ---- Requests ---------------------------------------------------------------

  // One thing being bought, plus the extras that usually come with it, so a
  // request's line items always belong together.
  const EXTRAS = [["Delivery", 180], ["Installation and setup", 950], ["Extended support (12 months)", 1200], ["Spare parts kit", 340]];

  function makeLineItems(departmentId) {
    const [description, unitPrice, maxQuantity] = pick(CATALOGUE[departmentId].items);
    const quantity = Math.max(1, Math.round(between(0.08, 1) ** 1.6 * maxQuantity));
    const items = [{ description, quantity, unitPrice }];
    if (quantity > 1 && random() < 0.6) items.push({ description: EXTRAS[0][0], quantity: 1, unitPrice: EXTRAS[0][1] });
    if (unitPrice > 300 && random() < 0.45) {
      const [extra, extraPrice] = pick(EXTRAS.slice(1));
      items.push({ description: extra, quantity: 1, unitPrice: extraPrice });
    }
    return items;
  }

  function makeAttachments(vendor, total) {
    const slug = vendor.replace(/[^A-Za-z]+/g, "-").replace(/-$/, "");
    const files = [{ name: `Quote-${slug}.pdf`, kind: "quote", sizeKb: Math.round(between(80, 900)) }];
    if (total >= 5000) files.push({ name: "Vendor-comparison.xlsx", kind: "comparison", sizeKb: Math.round(between(20, 90)) });
    if (random() < 0.3) files.push({ name: "Specification.pdf", kind: "spec", sizeKb: Math.round(between(200, 2400)) });
    return files;
  }

  function approverFor(role, departmentId) {
    if (role === "manager") return DEPARTMENTS.find((department) => department.id === departmentId).managerId;
    if (role === "finance") return FINANCE_APPROVER;
    return DIRECTOR_APPROVER;
  }

  // Builds route + history from an outcome, walking back in time from `now`.
  function makeJourney(request, outcome, stopAt, waitHours, now) {
    const route = routeFor(totals(request).total).map((role) => ({
      role,
      approverId: approverFor(role, request.departmentId),
      status: "waiting",
      decidedAt: null,
      note: "",
    }));
    const lastIndex = outcome === "approved" ? route.length - 1 : Math.min(stopAt, route.length - 1);
    // Time of the newest event, then earlier steps further back.
    let time = now - waitHours * HOUR;
    const events = [];
    for (let index = lastIndex; index >= 0; index--) {
      const step = route[index];
      const isLast = index === lastIndex;
      if (isLast && outcome === "in_review") {
        step.status = "pending";
      } else if (isLast && outcome === "changes_requested") {
        step.status = "sent_back";
        step.note = pick(SEND_BACK_REASONS);
        step.decidedAt = new Date(time).toISOString();
        events.unshift({ at: step.decidedAt, actorId: step.approverId, type: "sent_back", role: step.role, note: step.note });
      } else if (isLast && outcome === "rejected") {
        step.status = "rejected";
        step.note = pick(REJECT_REASONS);
        step.decidedAt = new Date(time).toISOString();
        events.unshift({ at: step.decidedAt, actorId: step.approverId, type: "rejected", role: step.role, note: step.note });
      } else {
        step.status = "approved";
        step.note = pick(APPROVE_NOTES);
        step.decidedAt = new Date(time).toISOString();
        events.unshift({ at: step.decidedAt, actorId: step.approverId, type: "approved", role: step.role, note: step.note });
      }
      time -= between(3, 52) * HOUR;
    }
    const createdAt = new Date(time).toISOString();
    events.unshift({ at: createdAt, actorId: request.requesterId, type: "submitted", note: request.justification });
    request.route = route;
    request.history = events;
    request.createdAt = createdAt;
    request.status = outcome;
    request.arrivedAt = new Date(now - waitHours * HOUR).toISOString();
    if (outcome === "approved" || outcome === "rejected") request.closedAt = request.arrivedAt;
    return request;
  }

  function makeRequest(number, now) {
    const department = pick(DEPARTMENTS);
    const staff = STAFF.filter((person) => person.departmentId === department.id && person.id !== "p-kenji");
    const requester = pick(staff);
    const vendor = pick(CATALOGUE[department.id].vendors);
    const lineItems = makeLineItems(department.id);
    // About one in three requests is a large programme (a site fit-out, a fleet refresh).
    if (random() < 0.3) {
      const scale = between(5, 14);
      lineItems[0].quantity = Math.max(1, Math.round(lineItems[0].quantity * scale));
    }
    const request = {
      id: `PR-${24700 + number}`,
      title: lineItems[0].description.replace(/ \(.*\)$/, ""),
      requesterId: requester.id,
      departmentId: department.id,
      vendor,
      costCentre: `CC-${department.id.toUpperCase()}-${100 + Math.floor(random() * 40)}`,
      neededBy: new Date(now + between(5, 45) * 24 * HOUR).toISOString(),
      justification: `Needed for ${department.name.toLowerCase()} — ${pick(["replacing worn-out stock", "the Q1 plan", "the new site opening", "a contract renewal", "growth in the team"])}.`,
      lineItems,
      taxRate: 0.08,
    };
    request.attachments = makeAttachments(vendor, totals(request).total);

    const roll = random();
    const outcome = roll < 0.56 ? "in_review" : roll < 0.66 ? "changes_requested" : roll < 0.9 ? "approved" : "rejected";
    const routeLength = routeFor(totals(request).total).length;
    const stopAt = Math.floor(random() * routeLength);
    // Most requests arrived recently; a tail has been waiting for days.
    const waitHours = outcome === "in_review" ? 0.5 + 150 * random() ** 2.2 : between(2, 160);
    return makeJourney(request, outcome, stopAt, waitHours, now);
  }

  // Kenji's own requests, written by hand so the requester view tells a story.
  function makeKenjiRequests(now) {
    const base = {
      requesterId: "p-kenji", departmentId: "fac", costCentre: "CC-FAC-112", taxRate: 0.08,
      neededBy: new Date(now + 21 * 24 * HOUR).toISOString(),
    };
    const chairs = { ...base, id: "PR-24690", title: "Ergonomic chairs for the 3rd floor", vendor: "Oakframe Furniture",
      justification: "The 3rd-floor chairs are 9 years old; four have failed this month.",
      lineItems: [{ description: "Ergonomic task chairs", quantity: 24, unitPrice: 389 }, { description: "Delivery and assembly", quantity: 1, unitPrice: 640 }] };
    const hvac = { ...base, id: "PR-24684", title: "HVAC quarterly service — Building B", vendor: "Meridian HVAC",
      justification: "Contracted quarterly service; Q4 visit.",
      lineItems: [{ description: "HVAC quarterly service — Building B", quantity: 1, unitPrice: 4800 }, { description: "Filter set replacement", quantity: 12, unitPrice: 86 }] };
    const refit = { ...base, id: "PR-24671", title: "Meeting-room refit, 2nd floor", vendor: "Brightline Facilities",
      justification: "Six rooms booked at 95% — refit two storage rooms as meeting rooms.",
      lineItems: [{ description: "Partition walls and doors", quantity: 2, unitPrice: 14200 }, { description: "Acoustic panels", quantity: 48, unitPrice: 210 },
        { description: "AV kit — screens and cameras", quantity: 2, unitPrice: 6900 }, { description: "Electrical and data cabling", quantity: 1, unitPrice: 5400 }] };
    const lights = { ...base, id: "PR-24702", title: "LED panel retrofit, 3rd floor", vendor: "Brightline Facilities",
      justification: "Cuts lighting energy by about 40%; the old tubes are failing.",
      lineItems: [{ description: "LED panels 600×600", quantity: 38, unitPrice: 95 }] };
    const clean = { ...base, id: "PR-24655", title: "Deep clean after the 4th-floor refit", vendor: "Brightline Facilities",
      justification: "Post-construction clean before staff move back.",
      lineItems: [{ description: "Deep clean after refit", quantity: 1, unitPrice: 2600 }] };

    const requests = [];
    for (const request of [chairs, hvac, refit, lights, clean]) {
      request.attachments = makeAttachments(request.vendor, totals(request).total);
    }
    requests.push(makeJourney(chairs, "changes_requested", 0, 26, now));
    chairs.route[0].note = SEND_BACK_REASONS[0];
    chairs.history[chairs.history.length - 1].note = SEND_BACK_REASONS[0];
    requests.push(makeJourney(hvac, "in_review", 1, 98, now));
    requests.push(makeJourney(refit, "in_review", 2, 20, now));
    requests.push(makeJourney(lights, "in_review", 0, 5, now));
    requests.push(makeJourney(clean, "approved", 0, 70, now));
    return requests;
  }

  function buildSeed(now = Date.now()) {
    const requests = makeKenjiRequests(now);
    for (let number = 1; number <= 156; number++) requests.push(makeRequest(number, now));
    return requests;
  }

  return {
    DEPARTMENTS, PERSONAS, PEOPLE, SEND_BACK_REASONS, REJECT_REASONS, approverFor,
    person: (id) => PEOPLE.get(id) || { id, name: "Unknown", title: "" },
    department: (id) => DEPARTMENTS.find((department) => department.id === id) || { id, name: id },
    buildSeed,
  };
})();
