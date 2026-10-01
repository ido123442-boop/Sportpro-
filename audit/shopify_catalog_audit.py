"""Summarize a Shopify bulk-operation JSONL export (products + nested variants).

Usage: python3 audit/shopify_catalog_audit.py <export.jsonl>

The export is produced by bulkOperationRunQuery over
products{id handle title vendor productType status tags createdAt updatedAt totalInventory
variants{id sku barcode title price compareAtPrice inventoryQuantity inventoryPolicy selectedOptions}}.
Read-only: this script never talks to Shopify. Do not commit exports (repo is public).
"""
import collections as C
import json
import sys


def load(path):
    products, variants = {}, []
    for line in open(path, encoding="utf-8"):
        o = json.loads(line)
        if "/Product/" in o["id"]:
            o["variants"] = []
            products[o["id"]] = o
        else:
            variants.append(o)
            products[o["__parentId"]]["variants"].append(o)
    return products, variants


def supplier(p):
    tags = [t.split(":", 1)[1] for t in p["tags"] if t.startswith("ספק:")]
    return "|".join(sorted(tags)) if tags else "(none)"


def main(path):
    P, V = load(path)
    qty = lambda v: v["inventoryQuantity"] or 0
    print("products", len(P), "variants", len(V))
    print("product status", dict(C.Counter(p["status"] for p in P.values())))
    with_sku = [v for v in V if v["sku"]]
    print("variants with SKU", len(with_sku), "without", len(V) - len(with_sku))
    dup = C.Counter(v["sku"] for v in with_sku)
    print("duplicate SKU values", sum(c > 1 for c in dup.values()),
          "variants involved", sum(c for c in dup.values() if c > 1))
    print("variants with barcode", sum(bool(v["barcode"]) for v in V))
    print("variants qty>0", sum(qty(v) > 0 for v in V))
    print("ACTIVE products with zero qty on all variants",
          sum(p["status"] == "ACTIVE" and all(qty(v) <= 0 for v in p["variants"]) for p in P.values()))
    print("\nsupplier tag: ACTIVE DRAFT ARCHIVED | ACTIVE variants, with SKU, qty>0")
    rows = C.defaultdict(lambda: C.Counter())
    for p in P.values():
        r = rows[supplier(p)]
        r[p["status"]] += 1
        if p["status"] == "ACTIVE":
            for v in p["variants"]:
                r["av"] += 1
                r["avsku"] += bool(v["sku"])
                r["avqty"] += qty(v) > 0
    for s, r in sorted(rows.items(), key=lambda x: (-x[1]["ACTIVE"], -x[1]["DRAFT"])):
        print(f"  {s:30} {r['ACTIVE']:5} {r['DRAFT']:5} {r['ARCHIVED']:3} | {r['av']:5} {r['avsku']:5} {r['avqty']:5}")


if __name__ == "__main__":
    main(sys.argv[1])
