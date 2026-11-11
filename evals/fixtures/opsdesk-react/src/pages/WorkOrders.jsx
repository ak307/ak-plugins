import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Field, Modal, Select, Table, Tabs, TextArea, TextInput, useToast } from "../components/ui";
import { BUILDINGS, PRIORITY_TONES, STATUS_LABELS, STATUS_TONES, TRADES, workOrders } from "../data/workOrders.js";

const EMPTY_FORM = { title: "", building: BUILDINGS[0], trade: TRADES[0], priority: "normal", notes: "" };

export default function WorkOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "open";
  const selectedId = params.get("order");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setRows(await workOrders.list());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(Object.keys(STATUS_LABELS).map(
    (key) => [key, rows.filter((row) => row.status === key).length])), [rows]);
  const visible = rows.filter((row) => row.status === status);
  const selected = rows.find((row) => row.id === selectedId);

  const setView = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next);
  };

  const create = async () => {
    if (!form.title.trim()) { setFormError("Describe the problem so the technician knows what to bring."); return; }
    setSaving(true);
    try {
      const row = { ...form, id: `WO-${5000 + rows.length}`, status: "open", reported: new Date().toISOString() };
      await workOrders.insert(row);
      setRows((current) => [row, ...current]);
      setCreating(false);
      setForm(EMPTY_FORM);
      setView({ status: "open", order: row.id });
      toast(`${row.id} raised for ${row.building}`);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "id", label: "Order" },
    { key: "title", label: "Problem" },
    { key: "building", label: "Building" },
    { key: "priority", label: "Priority", render: (row) => <Badge tone={PRIORITY_TONES[row.priority]}>{row.priority}</Badge> },
    { key: "status", label: "Status", render: (row) => <Badge tone={STATUS_TONES[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Work orders</h1>
          <p>{loading ? "Loading…" : `${counts.open} open across ${BUILDINGS.length} buildings`}</p>
        </div>
        <Button onClick={() => { setFormError(""); setCreating(true); }}>New work order</Button>
      </div>
      <div className="stack">
        <Tabs
          label="Status"
          value={status}
          onChange={(value) => setView({ status: value, order: null })}
          items={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label, count: loading ? undefined : counts[value] }))}
        />
        <div className="split">
          {loadError ? (
            <Card><EmptyState title="Work orders didn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>{loadError}</EmptyState></Card>
          ) : (
            <Table
              caption="Work orders"
              columns={columns}
              rows={visible}
              loading={loading}
              selectedId={selectedId}
              onRowClick={(row) => setView({ order: row.id })}
              empty={<EmptyState title={`No ${STATUS_LABELS[status].toLowerCase()} work orders`} />}
            />
          )}
          <Card title={selected ? selected.id : "Details"}>
            {selected ? (
              <div className="stack">
                <strong>{selected.title}</strong>
                <span>{selected.building} · {selected.trade}</span>
                <span>Reported {new Date(selected.reported).toLocaleString("en-SG")}</span>
                <div><Badge tone={STATUS_TONES[selected.status]}>{STATUS_LABELS[selected.status]}</Badge></div>
              </div>
            ) : (
              <EmptyState title="Pick a work order">Its details show here.</EmptyState>
            )}
          </Card>
        </div>
      </div>
      <Modal
        open={creating}
        title="New work order"
        onClose={() => setCreating(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button busy={saving} onClick={create}>Raise work order</Button>
          </>
        )}
      >
        <Field label="Problem" error={formError}>
          {(props) => <TextInput {...props} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />}
        </Field>
        <Field label="Building">
          {(props) => <Select {...props} value={form.building} onChange={(event) => setForm({ ...form, building: event.target.value })} options={BUILDINGS.map((name) => ({ value: name, label: name }))} />}
        </Field>
        <Field label="Trade">
          {(props) => <Select {...props} value={form.trade} onChange={(event) => setForm({ ...form, trade: event.target.value })} options={TRADES.map((name) => ({ value: name, label: name }))} />}
        </Field>
        <Field label="Notes" hint="Access instructions, contact on site.">
          {(props) => <TextArea {...props} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />}
        </Field>
      </Modal>
    </>
  );
}
