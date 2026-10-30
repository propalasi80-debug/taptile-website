# Taptile Mini — Bill of Materials

Everything that solders to or plugs into the PCB. Case, keycaps and knobs are
tracked separately.

Last updated 15 Aug 2026. Prices NZD, landed (item + shipping + GST where it
applies). Treat them as estimates and re-check at order time.

---

## Read this before the table

There are two different BOMs for this product and confusing them will cost you
money.

**The prototype BOM** (below) uses a controller *module* — a small
pre-assembled board carrying the RP2040 chip, flash, crystal, regulator, USB-C
and the boot/reset buttons. It is expensive per unit and completely appropriate,
because the module's job is to remove risk. The hard parts of an RP2040 design
(USB differential pair, crystal load caps, power sequencing) are already solved
and known-good. If the prototype doesn't work, you know the fault is in your
9 switches and 2 encoders, not in a crystal you mis-specified.

**The production BOM** puts the bare RP2040 on the board and has JLCPCB
machine-assemble it. Roughly USD$4-6 of parts instead of a NZ$10-60 module. That
is how the AliExpress boards hit NZ$30 retail. It is also a much harder design,
and there is no point attempting it until the prototype proves the firmware and
configurator work end to end.

**Do not benchmark the prototype's unit cost against a finished competitor
product.** At quantity 2, cost per unit is not a meaningful number. See
`Competing on price` at the bottom.

---

## Prototype BOM — quantity 1 board

| # | Part | Qty | Spec | NZ$ | Notes |
|---|------|-----|------|-----|-------|
| 1 | PCB | 5 | 2-layer, ~70×120mm, 1.6mm, HASL | ~28 | JLCPCB min. order is 5 |
| 2 | Key switches | 9 | Gateron Milky Yellow Pro, 5-pin | 17–35 | See quantity note |
| 3 | Rotary encoder | 2 | EC11, vertical, 20mm shaft, with push switch | ~8 | Buy a 5-pack |
| 4 | Female header | 2 | 1×12, 2.54mm pitch | ~3 | Socket for the module |
| 5 | Controller module | 1 | RP2040, Pro Micro form factor | 8–60 | **See controller options** |

**Board total: NZ$64–134**, dominated entirely by the controller choice.

### Not required, and why

No diodes — 9 keys on 9 dedicated GPIO is a direct-pin layout, not a matrix.
Nothing to ghost, nothing to block.

No pull-up resistors — the RP2040 has internal pull-ups and QMK enables them for
both the key inputs and the encoder phases.

No capacitors, crystal, voltage regulator, USB connector, boot button, reset
button or power LED. Every one of those is on the controller module. Adding your
own would be paying twice for the same hardware.

---

## Controller options

The single biggest cost decision on the board.

| Option | NZ$ landed | Pinout | Verdict |
|--------|-----------|--------|---------|
| AliExpress RP2040 Pro Micro | 8–12 | **Varies by seller** | Cheapest. Buy 3. |
| Adafruit KB2040, NZ reseller | 35–45 | Known, schematic matches | Certainty, at a price |
| Adafruit KB2040, direct | ~60 | Known, schematic matches | Shipping from NY kills it |
| Keebio Elite-Pi | ~30 + US ship | Documented | Best docs, 16MB flash |

### The clone warning

Pro Micro RP2040 boards share the same 24-pad physical footprint but **do not
share the same GPIO assignments.** Adafruit's KB2040 pinout deviates from
SparkFun's Pro Micro RP2040, and AliExpress clones copy one or the other, or
neither. Plug the wrong one in and keys land on pins that aren't connected.

This is recoverable and cheap to fix. `hardware/gen_schematic.py` wires the whole
board with net *labels* — the `LEFT` and `RIGHT` arrays near the top are a list
of 24 strings. Change them to match whichever module you buy, re-run the script,
re-run `Update PCB from Schematic`. Ten minutes, no redrawing.

**So: buy the module first, then finalise the schematic.** Get the seller's
pinout diagram before ordering, not after.

### Current pin assignment (Adafruit KB2040)

| Function | Pin |
|----------|-----|
| Keys SW1–SW9 | GP0, GP1, GP2, GP3, GP4, GP5, GP6, GP7, GP8 |
| Encoder 1 rotate | GP9 (A), GP10 (B) |
| Encoder 1 click | GP18 |
| Encoder 2 rotate | GP19 (A), GP20 (B) |
| Encoder 2 click | GP26 |
| Unused | RAW, RESET, 3V3, GP27, GP28, GP29 |

Mirrored in `firmware/taptile/mini/keyboard.json`. **These two files must agree**
— if you change one, change the other, or the configurator will map keys to the
wrong physical buttons.

---

## Ordering gotchas

**Switch quantity.** You need 9. Gateron packs are usually 10, 35, 65 or 110 —
confirm the listing quantity before checkout. The linked listing at NZ$16.61 may
be a 5-pack, in which case you need two.

**Encoder shaft.** EC11s come in 15mm, 18mm and 20mm shafts, knurled or D-shaft.
The knob you buy must match the shaft type. Order the encoders and knobs
together from the same place if you can.

**Module headers.** Genuine Adafruit boards ship with male header pins loose in
the bag. Clones often don't. If yours doesn't, add 2× 1×12 male headers (~NZ$2).
You solder those to the module; it then plugs into the female sockets on the PCB.

**Socket vs direct-solder the module.** The BOM assumes sockets (item 4), so the
module can be pulled out and reused if the first board revision is wrong. Costs
about 4mm of height. On a first prototype this is worth it.

**Switches are hot-swap.** The 15 Aug plan was direct-solder to save the Kailh
sockets (~NZ$4-6 a board); the first run of 25 was built hot-swap instead
(confirmed 30 Oct). Add the sockets to this BOM with their real cost.

**Buy spares of the cheap things.** Encoders and modules are the two parts most
likely to die from static, heat or a wiring mistake. At NZ$2 and NZ$10 each, a
spare of both is the cheapest insurance you will ever buy.

---

## Assembly

Hand-soldered. JLCPCB assembly was considered and rejected: their service is
built for SMD parts from their own library, this board is 13 through-hole parts,
they don't stock Gateron switches, and consigning your own parts to Shenzhen
means weeks of delay plus a handling fee. Roughly USD$25-40 versus USD$8 for
bare boards.

Through-hole MX switches are the easiest soldering that exists — large pads, wide
spacing, no fine pitch, nothing heat-sensitive. About 50 joints total, call it
30 minutes.

**Tools, if you don't own them:** soldering iron NZ$40–70, 0.8mm leaded solder
NZ$10, flush cutters NZ$15, solder sucker NZ$10. One-off cost, not per board.

---

## Competing on price

Worth writing down so it doesn't get relitigated.

A finished 9-key, 2-knob macropad on AliExpress is NZ$25-40 delivered. That is
less than one genuine Adafruit module. This is not a costing error on your part
— it is real, and it does not go away with better sourcing.

They amortise injection-mould tooling over tens of thousands of units and buy
components by the reel. Your landed cost at quantity 100 with a bare-chip design
would be roughly NZ$35-50. Theirs is NZ$15-20. **That gap does not close at any
volume you will reach.**

Which is fine, because price was never the opening. Five suppliers refused to
disclose what chip was inside or support open firmware. Their configurators are
Windows-only executables. Taptile already has a browser-based VIA configurator
that runs on any machine with Chrome and requires no install.

**Position above the cheap boards on software, not below them on price.**

The prototype's job is to prove the hardware talks to the configurator. Nothing
else. Judge it on that.

---

## Not on this board

Tracked separately: case, keycaps, encoder knobs, M3 screws, rubber feet,
USB-C cable.
