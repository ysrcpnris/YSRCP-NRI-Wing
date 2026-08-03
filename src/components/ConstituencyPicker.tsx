import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Constituency → mandal → village picker.
 *
 * WHY THIS EXISTS
 *   These three were free-text fields, and the production export shows
 *   the result: 2,429 members entered 240 distinct constituency strings
 *   where 175 exist, and 1,523 entered 722 distinct mandals. Nothing can
 *   be matched against that — not Local Connect, not a mandal president,
 *   not a constituency report.
 *
 * WHY A SEARCH RATHER THAN A DROPDOWN
 *   175 constituencies is unusable as a <select>. Members type what they
 *   remember and pick from what matches; what gets STORED is always a
 *   known value. That distinction is the whole point.
 *
 * WHY DISTRICT IS NOT A FIELD
 *   A constituency belongs to exactly one district, so asking for it is
 *   asking someone to tell us something we already know. It is derived
 *   and shown read-only.
 *
 * WHY MANDAL IS KEYED BY CONSTITUENCY
 *   Mandal names repeat across the state — Atmakur is a mandal in
 *   Nandyal, in Srisailam and in Anantapur Urban. Looking one up by name
 *   alone would silently pick the wrong place.
 */

type Constituency = {
  constituency_id: number;
  constituency: string;
  district: string;
  district_id: number;
  mandal_count: number;
};

type Mandal = { id: number; name: string };
type Village = { id: number; name: string };

export type GeoValue = {
  constituency: string;
  constituency_id: number | null;
  district: string;
  mandal: string;
  mandal_id: number | null;
  village: string;
};

export const EMPTY_GEO: GeoValue = {
  constituency: "",
  constituency_id: null,
  district: "",
  mandal: "",
  mandal_id: null,
  village: "",
};

export default function ConstituencyPicker({
  value,
  onChange,
  required = true,
}: {
  value: GeoValue;
  onChange: (v: GeoValue) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState(value.constituency);
  const [results, setResults] = useState<Constituency[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Debounced so typing "nandyal" is one request at rest rather than
  // seven in flight.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase.rpc("search_constituencies", {
        q: query,
      });
      setSearching(false);
      if (error) {
        console.error("constituency search failed:", error);
        setResults([]);
        return;
      }
      setResults((data as Constituency[]) ?? []);
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  // Mandals for the chosen constituency.
  useEffect(() => {
    if (!value.constituency_id) {
      setMandals([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("ap_mandals")
        .select("id, name")
        .eq("constituency_id", value.constituency_id)
        .eq("is_active", true)
        .order("name");
      setMandals((data as Mandal[]) ?? []);
    })();
  }, [value.constituency_id]);

  // Villages for the chosen mandal.
  useEffect(() => {
    if (!value.mandal_id) {
      setVillages([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("ap_villages")
        .select("id, name")
        .eq("mandal_id", value.mandal_id)
        .eq("is_active", true)
        .order("name");
      setVillages((data as Village[]) ?? []);
    })();
  }, [value.mandal_id]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const pick = (c: Constituency) => {
    setQuery(c.constituency);
    setOpen(false);
    // Changing constituency clears mandal and village: a mandal from the
    // previous constituency would be a different place entirely.
    onChange({
      constituency: c.constituency,
      constituency_id: c.constituency_id,
      district: c.district,
      mandal: "",
      mandal_id: null,
      village: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Constituency — typed and searched */}
      <div className="relative" ref={boxRef}>
        <label className="input-label">
          Assembly constituency {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          className="input-field"
          autoComplete="off"
          placeholder="Start typing — e.g. nandy, puli, or a district"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // Typing after a selection invalidates it — otherwise a
            // member could edit the text and keep the old id.
            if (value.constituency_id) onChange({ ...EMPTY_GEO });
          }}
        />
        <p className="text-xs text-gray-500 mt-1">
          175 of them — searches the constituency <em>or</em> its district.
        </p>

        {open && (
          <ul
            className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto
                       bg-white border border-gray-200 rounded-lg shadow-lg p-1"
          >
            {searching && (
              <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>
            )}
            {!searching && results.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">
                Nothing matches “{query}”
              </li>
            )}
            {results.map((c) => (
              <li
                key={c.constituency_id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                className="px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-primary-50"
              >
                <span className="font-semibold">{c.constituency}</span>
                <span className="text-gray-500 text-xs"> · {c.district} district</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* District — derived, never asked */}
        <div>
          <label className="input-label">
            District{" "}
            <span className="text-xs font-normal text-green-700">auto</span>
          </label>
          <input
            type="text"
            className="input-field bg-gray-50 text-gray-600"
            value={value.district}
            placeholder="Fills from your constituency"
            readOnly
          />
        </div>

        {/* Mandal — required only where mandals are actually loaded.
            ap_mandals is seeded constituency by constituency, so the
            asterisk appears as the reference data arrives rather than
            demanding a value the dropdown cannot offer. */}
        <div>
          <label className="input-label">
            Mandal{" "}
            {required && mandals.length > 0 && <span className="text-red-500">*</span>}
            {value.constituency_id && mandals.length === 0 && (
              <span className="text-xs font-normal text-gray-500">
                optional — not listed yet
              </span>
            )}
          </label>
          <select
            className="input-field"
            disabled={!value.constituency_id}
            value={value.mandal_id ?? ""}
            onChange={(e) => {
              const m = mandals.find((x) => String(x.id) === e.target.value);
              onChange({
                ...value,
                mandal: m?.name ?? "",
                mandal_id: m?.id ?? null,
                village: "",
              });
            }}
          >
            <option value="">
              {!value.constituency_id
                ? "Pick a constituency first"
                : mandals.length === 0
                ? "No mandals listed yet"
                : "Choose…"}
            </option>
            {mandals.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {value.constituency_id && mandals.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {mandals.length} in {value.constituency}
            </p>
          )}
        </div>
      </div>

      {/* Village — optional. Lists are long and plenty of members
          genuinely do not know theirs. */}
      <div>
        <label className="input-label">
          Village <span className="text-xs font-normal text-gray-500">optional</span>
        </label>
        <select
          className="input-field"
          disabled={!value.mandal_id || villages.length === 0}
          value={value.village}
          onChange={(e) => onChange({ ...value, village: e.target.value })}
        >
          <option value="">
            {!value.mandal_id
              ? "Pick a mandal first"
              : villages.length === 0
              ? "None listed — leave blank"
              : "Choose…"}
          </option>
          {villages.map((v) => (
            <option key={v.id} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
