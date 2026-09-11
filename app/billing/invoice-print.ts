import type { DbBillingSettings, DbCustomer, DbInventoryItem, DbInvoice, DbInvoiceAdjustment, DbInvoiceItem, DbMaterialUsage, DbSite, DbWorkOrder } from "./types";

function esc(value:unknown){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]??char));}
function money(value:number,currency:string){return new Intl.NumberFormat("en-CA",{style:"currency",currency}).format(Number(value||0));}
function date(value:string|null){if(!value)return "—";const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?esc(value):d.toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"});}
function compactNumber(value:number){if(Number.isInteger(value))return String(value);return value.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");}
function compactUnit(unit:string|null|undefined){const normalized=(unit??"").trim().toLowerCase();const map:Record<string,string>={each:"ea",ea:"ea",piece:"ea",pieces:"ea",pcs:"ea",meter:"m",meters:"m",metre:"m",metres:"m",kilometer:"km",kilometers:"km",kilometre:"km",kilometres:"km",kilogram:"kg",kilograms:"kg",gram:"g",grams:"g",litre:"L",litres:"L",liter:"L",liters:"L",hour:"h",hours:"h",minute:"min",minutes:"min"};return map[normalized]??(unit?.trim()||"ea");}
function timeQuantityLabel(hoursValue:number){const totalMinutes=Math.max(0,Math.round(hoursValue*60));const hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;if(hours>0&&minutes>0)return `${hours} h ${minutes} min`;if(hours>0)return `${hours} h`;return `${minutes} min`;}
function materialUnitForLine(line:DbInvoiceItem,materialUsages:DbMaterialUsage[],inventoryItems:DbInventoryItem[]){if(line.source_type!=="material_usage"||!line.source_id)return "ea";const usage=materialUsages.find(candidate=>candidate.id===line.source_id);const item=usage?.inventory_item_id?inventoryItems.find(candidate=>candidate.id===usage.inventory_item_id):null;return compactUnit(item?.unit);}
function quantityLabel(line:DbInvoiceItem,materialUsages:DbMaterialUsage[],inventoryItems:DbInventoryItem[]){const value=Number(line.quantity||0);if(line.source_type==="time_entry"||line.source_type==="billing_rule")return timeQuantityLabel(value);if(line.source_type==="travel_setting")return `${compactNumber(value)} km`;if(line.line_type==="material"||line.line_type==="equipment")return `${compactNumber(value)} ${materialUnitForLine(line,materialUsages,inventoryItems)}`;return `${compactNumber(value)} ea`;}
function rateUnit(line:DbInvoiceItem,materialUsages:DbMaterialUsage[],inventoryItems:DbInventoryItem[]){if(line.source_type==="time_entry"||line.source_type==="billing_rule")return "h";if(line.source_type==="travel_setting")return "km";if(line.line_type==="material"||line.line_type==="equipment")return materialUnitForLine(line,materialUsages,inventoryItems);return "ea";}
function displayDescription(line:DbInvoiceItem){if(line.source_type==="billing_rule"&&line.description.startsWith("Minimum labour charge"))return line.description.replace("Minimum labour charge","Minimum labour top-up");return line.description;}
function categoryOf(line:DbInvoiceItem):"Labour"|"Travel"|"Items"{if(line.line_type==="travel")return "Travel";if(line.line_type==="material"||line.line_type==="equipment")return "Items";return "Labour";}
function groupMaterialInvoiceLines(lines:DbInvoiceItem[],materialUsages:DbMaterialUsage[]){
  const usageMap=new Map(materialUsages.map(usage=>[usage.id,usage]));
  const grouped=new Map<string,DbInvoiceItem>();
  const passthrough:DbInvoiceItem[]=[];
  for(const line of lines){
    if(line.line_type!=="material"||line.source_type!=="material_usage"||!line.source_id){passthrough.push(line);continue;}
    const usage=usageMap.get(line.source_id);
    if(!usage?.inventory_item_id){passthrough.push(line);continue;}
    const key=[usage.inventory_item_id,Number(line.unit_price||0).toFixed(6),line.taxable?"taxable":"non-taxable"].join("|");
    const existing=grouped.get(key);
    if(!existing){grouped.set(key,{...line});continue;}
    grouped.set(key,{...existing,quantity:Number(existing.quantity||0)+Number(line.quantity||0),line_total:Number(existing.line_total||0)+Number(line.line_total||0),sort_order:Math.min(Number(existing.sort_order||0),Number(line.sort_order||0))});
  }
  return [...passthrough,...grouped.values()].sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
}
function categoryTable(title:string,lines:DbInvoiceItem[],currency:string,materialUsages:DbMaterialUsage[],inventoryItems:DbInventoryItem[]){if(lines.length===0)return "";const rows=lines.map(line=>`<tr><td><strong>${esc(displayDescription(line))}</strong><small>${esc(line.line_type)}${line.taxable?" · taxable":""}</small></td><td class="num">${esc(quantityLabel(line,materialUsages,inventoryItems))}</td><td class="num">${money(line.unit_price,currency)} / ${esc(rateUnit(line,materialUsages,inventoryItems))}</td><td class="num strong">${money(line.line_total,currency)}</td></tr>`).join("");return `<table class="table category"><thead><tr class="category-title"><th colspan="4">${esc(title)}</th></tr><tr><th>Description</th><th class="num">Quantity / Unit</th><th class="num">Unit price</th><th class="num">Total</th></tr></thead><tbody>${rows}</tbody></table>`;}

export function printInvoiceDocument(args:{invoice:DbInvoice;customer:DbCustomer|null;site:DbSite|null;workOrder:DbWorkOrder|null;items:DbInvoiceItem[];adjustments:DbInvoiceAdjustment[];settings:DbBillingSettings|null;logoUrl:string|null;materialUsages:DbMaterialUsage[];inventoryItems:DbInventoryItem[];}){
 const {invoice,customer,site,workOrder,items,adjustments,settings,logoUrl,materialUsages,inventoryItems}=args;
 const companyAddress=[settings?.address1,settings?.address2,settings?.city,settings?.province_state,settings?.postal_code,settings?.country].filter(Boolean).join(", ");
 const customerAddress=invoice.site_address_snapshot||(site?[site.address1,site.address2,site.city,site.province_state,site.postal_code,site.country].filter(Boolean).join(", "):"");
 const displayItems=groupMaterialInvoiceLines(items,materialUsages);
 const grouped={Labour:displayItems.filter(x=>categoryOf(x)==="Labour"),Travel:displayItems.filter(x=>categoryOf(x)==="Travel"),Items:displayItems.filter(x=>categoryOf(x)==="Items")};
 const tables=categoryTable("Labour",grouped.Labour,invoice.currency,materialUsages,inventoryItems)+categoryTable("Travel",grouped.Travel,invoice.currency,materialUsages,inventoryItems)+categoryTable("Items",grouped.Items,invoice.currency,materialUsages,inventoryItems);
 const adj=adjustments.filter(a=>a.status==="posted").map(a=>`<div class="row"><span>${esc(a.adjustment_type==="credit"?"Credit note":"Additional charge")} · ${esc(a.reason)}</span><strong>${money(a.amount,invoice.currency)}</strong></div>`).join("");
 const logo=logoUrl?`<img class="logo" src="${esc(logoUrl)}" alt="Company logo"/>`:"";
 const footerPlainText=settings?.invoice_footer||`${settings?.company_name||"FieldOps"} · ${[settings?.phone,settings?.email,settings?.website].filter(Boolean).join(" · ")}`;
 const footerCssText=JSON.stringify(footerPlainText);
 const invoiceCssText=JSON.stringify(invoice.invoice_number);
 const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(invoice.invoice_number)}</title>

<style>

@page {
  size: A4;

  /*
   * Real A4 page margins.
   * The bottom 18mm is owned by the page footer, so invoice
   * rows can never run through the footer line.
   */
  margin: 10mm 10mm 18mm 10mm;

  /*
   * Chromium/Edge page-margin boxes repeat automatically
   * on every printed page.
   */
  @bottom-left {
    content: ${footerCssText};
    border-top: 2px solid #1fa974;
    padding-top: 2.5mm;
    color: #64748b;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    text-align: left;
    vertical-align: top;
  }

  @bottom-center {
    content: "";
    border-top: 2px solid #1fa974;
    vertical-align: top;
  }

  @bottom-right {
    content: ${invoiceCssText} " · Page " counter(page) " of " counter(pages);
    border-top: 2px solid #1fa974;
    padding-top: 2.5mm;
    color: #64748b;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    text-align: right;
    vertical-align: top;
    white-space: nowrap;
  }
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  background: #fff;
  color: #172033;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  line-height: 1.45;
}

/* =========================================================
   OUTER PRINT TABLE
   The THEAD repeats the invoice header on every printed page.
   ========================================================= */

.print-shell {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

.print-shell > thead {
  display: table-header-group;
}

.print-shell > tbody {
  display: table-row-group;
}

.print-shell > thead > tr > td,
.print-shell > tbody > tr > td {
  padding: 0;
  border: 0;
  vertical-align: top;
}

/* =========================================================
   ORIGINAL HEADER
   Keep the same visual design.
   ========================================================= */

.header-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border-bottom: 2px solid #1fa974;
  margin: 0 0 16px 0;
}

.header-table td {
  border: 0;
  padding: 0 0 14px 0;
  vertical-align: top;
}

.header-brand-cell {
  width: 70%;
  padding-right: 18px !important;
}

.header-invoice-cell {
  width: 30%;
  text-align: right;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}

.logo {
  width: 46px;
  height: 46px;
  object-fit: contain;
}

.company {
  font-size: 20px;
  font-weight: 800;
}

.muted {
  color: #64748b;
}

.invoice-title {
  text-align: right;
}

.invoice-title .label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.invoice-title .number {
  font-size: 24px;
  font-weight: 900;
  margin-top: 2px;
}

/* =========================================================
   ORIGINAL INVOICE BODY
   ========================================================= */

.page {
  width: 100%;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 0;
}

.card {
  border: 1px solid #dbe3ec;
  border-radius: 10px;
  padding: 14px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.card h4 {
  margin: 0 0 8px;
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #64748b;
}

.billto {
  font-size: 16px;
  font-weight: 800;
}

.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.meta b {
  display: block;
  font-size: 9px;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 3px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
  page-break-inside: auto;
}

.table thead {
  display: table-header-group;
}

.table tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

.table th {
  font-size: 9px;
  text-transform: uppercase;
  color: #64748b;
  background: #f4f7fa;
  padding: 8px;
  border-bottom: 1px solid #dbe3ec;
  text-align: left;
}

.table .category-title th {
  background: #e8f6f0;
  color: #0d6b4c;
  font-size: 11px;
  letter-spacing: .08em;
  border-top: 1px solid #b9dfd0;
}

.table td {
  padding: 9px 8px;
  border-bottom: 1px solid #e7edf3;
  vertical-align: top;
}

.table small {
  display: block;
  color: #64748b;
  text-transform: uppercase;
  font-size: 8px;
  margin-top: 2px;
}

.num {
  text-align: right !important;
  white-space: nowrap;
}

.strong {
  font-weight: 800;
}

.summary {
  width: 78mm;
  margin: 16px 0 0 auto;
  border: 1px solid #dbe3ec;
  border-radius: 10px;
  padding: 12px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
}

.row.total,
.row.balance {
  font-size: 15px;
  border-top: 1px solid #dbe3ec;
  margin-top: 5px;
  padding-top: 9px;
}

.adjust,
.notes {
  margin-top: 14px;
  border: 1px solid #dbe3ec;
  border-radius: 10px;
  padding: 12px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.notes {
  white-space: pre-wrap;
}

/* =========================================================
   FOOTER
   The footer is rendered by @page margin boxes above.
   Do not add a position:fixed footer here; fixed elements can
   jump into the repeated header during Chromium pagination.
   ========================================================= */

@media print {

  html,
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-shell > thead {
    display: table-header-group !important;
  }

  .print-shell > thead > tr,
  .print-shell > thead > tr > td,
  .header-table,
  .header-table tr,
  .header-table td {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .table thead {
    display: table-header-group !important;
  }

  .table {
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  .table tbody tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .table tr,
  .card,
  .summary,
  .adjust,
  .notes {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}

</style>
</head>

<body>

<table class="print-shell">

  <!--
    This THEAD is automatically repeated by the browser
    at the beginning of every printed page.
  -->
  <thead>
    <tr>
      <td>

        <table class="header-table" role="presentation">
          <tr>
            <td class="header-brand-cell">

              <div class="brand">

                ${logo}

                <div>

                  <div class="company">
                    ${esc(settings?.company_name || "FieldOps")}
                  </div>

                  <div class="muted">
                    ${esc(settings?.legal_name || "")}
                  </div>

                </div>

              </div>

              <div
                class="muted"
                style="margin-top:7px"
              >
                ${esc(companyAddress)}
              </div>

              <div class="muted">
                ${esc(
                  [
                    settings?.phone,
                    settings?.email,
                    settings?.website,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                )}
              </div>

            </td>

            <td class="header-invoice-cell">

              <div class="invoice-title">

                <div class="label">
                  INVOICE
                </div>

                <div class="number">
                  ${esc(invoice.invoice_number)}
                </div>

              </div>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </thead>


  <!--
    Invoice content can flow naturally across as many
    A4 pages as required.
  -->
  <tbody>
    <tr>
      <td>

        <div class="page">

          <div class="grid">

            <section class="card">

              <h4>Bill to</h4>

              <div class="billto">
                ${esc(
                  invoice.customer_name_snapshot ||
                    customer?.name ||
                    "Customer",
                )}
              </div>

              <div class="muted">
                ${esc(
                  invoice.billing_email_snapshot ||
                    customer?.billing_email ||
                    "",
                )}
              </div>

              <div
                class="muted"
                style="margin-top:6px"
              >
                ${esc(customerAddress)}
              </div>

            </section>


            <section class="card">

              <div class="meta">

                <div>
                  <b>Issued</b>
                  ${date(invoice.issued_date)}
                </div>

                <div>
                  <b>Due</b>
                  ${date(invoice.due_date)}
                </div>

                <div>
                  <b>Work Order</b>
                  ${esc(
                    workOrder?.work_order_number ||
                      "—",
                  )}
                </div>

                <div>
                  <b>Customer PO</b>
                  ${esc(
                    workOrder?.customer_po ||
                      "—",
                  )}
                </div>

              </div>

            </section>

          </div>


          ${
            tables ||
            '<div style="margin-top:20px;text-align:center;color:#64748b">No invoice items.</div>'
          }


          ${
            adj
              ? `
                <section class="adjust">

                  <strong>
                    Adjustments
                  </strong>

                  ${adj}

                </section>
              `
              : ""
          }


          <section class="summary">

            <div class="row">
              <span>Subtotal</span>

              <strong>
                ${money(
                  invoice.subtotal,
                  invoice.currency,
                )}
              </strong>
            </div>


            <div class="row">
              <span>Discount</span>

              <strong>
                -${money(
                  invoice.discount_amount,
                  invoice.currency,
                )}
              </strong>
            </div>


            <div class="row">
              <span>Tax</span>

              <strong>
                ${money(
                  invoice.tax_amount,
                  invoice.currency,
                )}
              </strong>
            </div>


            <div class="row total">

              <strong>
                Total
              </strong>

              <strong>
                ${money(
                  invoice.total,
                  invoice.currency,
                )}
              </strong>

            </div>


            <div class="row">

              <span>
                Paid
              </span>

              <strong>
                ${money(
                  invoice.amount_paid,
                  invoice.currency,
                )}
              </strong>

            </div>


            <div class="row balance">

              <strong>
                Balance Due
              </strong>

              <strong>
                ${money(
                  invoice.balance_due,
                  invoice.currency,
                )}
              </strong>

            </div>

          </section>


          ${
            invoice.notes
              ? `
                <section class="notes">

                  <strong>
                    Notes
                  </strong>

                  <div>
                    ${esc(invoice.notes)}
                  </div>

                </section>
              `
              : ""
          }

        </div>

      </td>
    </tr>
  </tbody>

</table>





<script>
window.addEventListener(
  "afterprint",
  () =>
    parent.postMessage(
      "fieldops-print-done",
      "*"
    )
);
</script>

</body>
</html>`;
 const frame=document.createElement("iframe");frame.setAttribute("aria-hidden","true");frame.style.position="fixed";frame.style.left="-10000px";frame.style.top="0";frame.style.width="210mm";frame.style.height="297mm";frame.style.opacity="0";frame.style.pointerEvents="none";frame.style.border="0";document.body.appendChild(frame);const target=frame.contentWindow,doc=frame.contentDocument;if(!target||!doc){frame.remove();throw new Error("Unable to create the invoice print document.");}doc.open();doc.write(html);doc.close();let cleaned=false;const cleanup=()=>{if(cleaned)return;cleaned=true;window.removeEventListener("message",onMessage);window.setTimeout(()=>frame.remove(),100);};const onMessage=(event:MessageEvent)=>{if(event.source===target&&event.data==="fieldops-print-done")cleanup();};window.addEventListener("message",onMessage);const printWhenReady=async()=>{try{const images=Array.from(doc.images);await Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise<void>(resolve=>{const done=()=>resolve();image.addEventListener("load",done,{once:true});image.addEventListener("error",done,{once:true});})));target.focus();target.print();}catch{cleanup();}};window.setTimeout(()=>void printWhenReady(),250);window.setTimeout(cleanup,60000);
}
