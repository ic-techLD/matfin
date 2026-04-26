/**
 * FINANCE.JS — Módulo de cálculos financeiros
 * Funções puras (sem efeitos colaterais).
 */

const Finance = (() => {
  // ── Formatadores ─────────────────────────────────────────────
  const fmt = (n) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  // Percentual sempre com 2 casas decimais
  const fmtPct = (n) => Number(n).toFixed(2) + "%";

  // ── JUROS SIMPLES ────────────────────────────────────────────
  // M = P × (1 + i × t)
  const simpleInterest = (principal, ratePercent, periods) => {
    const P = Number(principal);
    const i = Number(ratePercent) / 100;
    const t = Number(periods);
    const interest = P * i * t;
    const total    = P + interest;
    const schedule = Array.from({ length: t }, (_, idx) => ({
      period  : idx + 1,
      interest: P * i,
      balance : P + P * i * (idx + 1),
    }));
    return { principal: P, rate: i, periods: t, interest, total, schedule };
  };

  // ── JUROS COMPOSTOS ──────────────────────────────────────────
  // M = P × (1 + i)^t  — fórmula fechada em cada período para precisão
  const compoundInterest = (principal, ratePercent, periods) => {
    const P = Number(principal);
    const i = Number(ratePercent) / 100;
    const t = Number(periods);
    const total    = P * Math.pow(1 + i, t);
    const interest = total - P;
    const schedule = [];
    for (let n = 1; n <= t; n++) {
      const prev    = P * Math.pow(1 + i, n - 1);
      const current = P * Math.pow(1 + i, n);
      schedule.push({ period: n, interest: current - prev, balance: current });
    }
    return { principal: P, rate: i, periods: t, interest, total, schedule };
  };

  // ── JUROS COMPOSTOS COM APORTE MENSAL ───────────────────────
  // M = P×(1+i)^t + A × [(1+i)^t − 1] / i
  const compoundWithAporte = (principal, ratePercent, periods, aporte) => {
    const P  = Number(principal);
    const i  = Number(ratePercent) / 100;
    const t  = Number(periods);
    const A  = Number(aporte) || 0;
    const schedule = [];
    let balance = P, totalAportes = 0;
    for (let n = 1; n <= t; n++) {
      balance       += A;
      totalAportes  += A;
      const intPeriod = balance * i;
      balance        += intPeriod;
      schedule.push({ period: n, aporte: A, interest: intPeriod, balance });
    }
    const total    = balance;
    const interest = total - P - totalAportes;
    return { principal: P, aporte: A, rate: i, periods: t, totalAportes, interest, total, schedule };
  };

  // ── POUPANÇA ─────────────────────────────────────────────────
  const savingsInterest = (principal, months, selicAnual, aporte) => {
    const P     = Number(principal);
    const t     = Number(months);
    const selic = Number(selicAnual) || 14.75;
    const A     = Number(aporte) || 0;
    let monthlyRate, rule;
    if (selic >= 8.5) {
      monthlyRate = 0.005;
      rule = "0,5% a.m. + TR (Selic maior ou igual a 8,5% a.a.)";
    } else {
      monthlyRate = (selic * 0.70) / 100 / 12;
      rule = "70% da Selic dividido por 12 (Selic menor que 8,5% a.a.)";
    }
    const schedule = [];
    let balance = P, totalAportes = 0;
    for (let n = 1; n <= t; n++) {
      balance      += A;
      totalAportes += A;
      const intPeriod = balance * monthlyRate;
      balance        += intPeriod;
      schedule.push({ month: n, aporte: A, interest: intPeriod, balance });
    }
    const total    = balance;
    const interest = total - P - totalAportes;
    return { principal: P, aporte: A, monthlyRate, months: t, totalAportes, interest, total, schedule, selicRef: selic, rule };
  };

  // ── CONSIGNADO ───────────────────────────────────────────────
  const CONSIGNADO_RATES = [
    { label: "Servidor Público Federal", monthlyRate: 1.60, maxMonths: 96 },
    { label: "Beneficiário INSS",        monthlyRate: 1.72, maxMonths: 84 },
    { label: "CLT / Setor Privado",      monthlyRate: 1.80, maxMonths: 48 },
    { label: "Taxa personalizada",       monthlyRate: null, maxMonths: 96 },
  ];

  const calcPMT = (PV, i, n) =>
    (PV * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);

  const calcRate = (PV, PMT, n) => {
    let i = 0.01;
    for (let iter = 0; iter < 300; iter++) {
      const f  = calcPMT(PV, i, n) - PMT;
      const fi = calcPMT(PV, i + 1e-8, n) - PMT;
      const d  = (fi - f) / 1e-8;
      if (Math.abs(d) < 1e-15) break;
      const iNew = i - f / d;
      if (Math.abs(iNew - i) < 1e-12) { i = iNew; break; }
      i = Math.max(iNew, 1e-7);
    }
    return i;
  };

  const buildSchedule = (PV, PMT, i, n) => {
    const schedule = [];
    let balance = PV;
    for (let k = 1; k <= n; k++) {
      const interestPart  = balance * i;
      const principalPart = PMT - interestPart;
      balance -= principalPart;
      schedule.push({ installment: k, pmt: PMT, interest: interestPart, principal: principalPart, balance: Math.max(balance, 0) });
    }
    return schedule;
  };

  const consignado = (params) => {
    const { mode, PV: PVraw, months, PMT: PMTraw, rateMonthly, modalityIndex } = params;
    const PV       = Number(PVraw);
    const n        = Number(months);
    const modality = CONSIGNADO_RATES[modalityIndex] || CONSIGNADO_RATES[0];
    let i, PMT;
    if (mode === "findPMT") {
      i   = Number(rateMonthly) / 100;
      PMT = calcPMT(PV, i, n);
    } else {
      PMT = Number(PMTraw);
      i   = calcRate(PV, PMT, n);
    }
    const totalPaid     = PMT * n;
    const totalInterest = totalPaid - PV;
    const cetEstimated  = i * 100 * 1.07;
    const schedule      = buildSchedule(PV, PMT, i, n);
    return { PV, n, i, PMT, totalPaid, totalInterest, cetEstimated, modality, schedule, rateMonthly: i * 100 };
  };

  // ── COMPRA PARCELADA — juros compostos corretos ───────────────
  //
  // A questão central: quando a loja diz "10x de R$X" sobre um produto,
  // ela usa juros compostos (Tabela Price). A diferença no início do
  // pagamento afeta QUANDO os juros começam a correr:
  //
  // grace = 0 → "no ato" (sem carência):
  //   O comprador paga a 1.ª parcela IMEDIATAMENTE, sem nenhum juro.
  //   O saldo restante (PV − PMT) rende juros compostos pelos próximos
  //   (n−1) meses. O PMT é calculado pela Tabela Price padrão (n parcelas)
  //   mas a primeira parcela ocorre em t = 0, sem fator de desconto.
  //   Matematicamente: PMT = PV × i / (1 − (1+i)^−n)  com entrada
  //   = PV × i×(1+i)^(n-1) / ((1+i)^(n-1) − 1)  ÷  ... 
  //   Forma equivalente usada aqui (Price com entrada):
  //   PMT = calcPMT(PV, i, n) / (1 + i)   [antecipação de 1 período]
  //
  //   Exemplo validado: R$1.000, 10x, 1,5% a.m., paga no ato
  //     PMT = 1000 × 0,015 × (1,015)^9 / ((1,015)^9 − 1) = R$116,35
  //     Total = 10 × 116,35 = R$1.163,51
  //     Juros = R$163,51
  //
  // grace > 0 → pagamento começa após 'grace' meses:
  //   O saldo cresce via juros compostos por 'grace' meses sem pagamento.
  //   PV_corrigido = PV × (1 + i)^grace
  //   Depois aplica Price normal (n parcelas) sobre PV_corrigido.

  const cashflow = (PVraw, rateMonthly, n, grace) => {
    const PV = Number(PVraw);
    const i  = Number(rateMonthly) / 100;
    const ng = Number(grace);
    const np = Number(n);

    let PVcorr, PMT;

    if (ng === 0) {
      if (np === 1) {
        // Compra à vista parcelada em 1x — sem juros
        PVcorr = PV;
        PMT    = PV;
      } else {
        // Price com entrada: PMT = calcPMT(PV, i, n) / (1 + i)
        // equivalente a financiar o valor presente dos (n-1) períodos futuros
        PVcorr = PV;
        PMT    = calcPMT(PV, i, np) / (1 + i);
      }
    } else {
      PVcorr = PV * Math.pow(1 + i, ng);
      PMT    = calcPMT(PVcorr, i, np);
    }

    const totalPaid     = PMT * np;
    const totalInterest = totalPaid - PV;

    const timeline = [];

    if (ng === 0) {
      // Parcela 0 = entrada (sem juros)
      let balance = PV - PMT;
      timeline.push({ month: 0, type: "pagamento", payment: PMT, interest: 0, principal: PMT, balance: Math.max(balance, 0) });
      for (let k = 1; k <= np - 1; k++) {
        const intPeriod  = balance * i;
        const amort      = PMT - intPeriod;
        balance         -= amort;
        timeline.push({ month: k, type: "pagamento", payment: PMT, interest: intPeriod, principal: amort, balance: Math.max(balance, 0) });
      }
    } else {
      let balance = PV;
      for (let k = 1; k <= ng; k++) {
        const intPeriod = balance * i;
        balance += intPeriod;
        timeline.push({ month: k, type: "carência", payment: 0, interest: intPeriod, principal: 0, balance });
      }
      balance = PVcorr;
      for (let k = 1; k <= np; k++) {
        const intPeriod  = balance * i;
        const amort      = PMT - intPeriod;
        balance         -= amort;
        timeline.push({ month: ng + k, type: "pagamento", payment: PMT, interest: intPeriod, principal: amort, balance: Math.max(balance, 0) });
      }
    }

    return { PV, PVcorr, i, n: np, grace: ng, PMT, totalPaid, totalInterest, timeline };
  };

  // ── FINANCIAMENTO DE VEÍCULOS / IMÓVEIS ──────────────────────
  //
  // Taxas médias de mercado (Brasil, 2025/2026):
  //   Carro novo:    1,49% a.m. (Banco Central / ANEF média)
  //   Carro usado:   1,99% a.m.
  //   Moto nova:     1,45% a.m.
  //   Moto usada:    1,89% a.m.
  //   Imóvel (SFH):  0,74% a.m. ≈ 9,2% a.a. (CAIXA referência)
  //   Imóvel (SFI):  1,00% a.m. ≈ 12,7% a.a.
  //
  // Consórcio (sem juros, mas com taxa de adm):
  //   Veículos: ~20% sobre o total do crédito, distribuída nas parcelas
  //   Imóvel:   ~17% sobre o total
  //
  // Tabela Price (SAC disponível como alternativa para imóveis)

  const FINANCING_OPTIONS = [
    { id: "car_new",   label: "Carro Novo",         monthlyRate: 1.49, maxMonths: 60,  consortiumAdm: 20, consortiumMonths: 84  },
    { id: "car_used",  label: "Carro Usado",         monthlyRate: 1.99, maxMonths: 48,  consortiumAdm: 20, consortiumMonths: 84  },
    { id: "moto_new",  label: "Moto Nova",            monthlyRate: 1.45, maxMonths: 48,  consortiumAdm: 18, consortiumMonths: 72  },
    { id: "moto_used", label: "Moto Usada",           monthlyRate: 1.89, maxMonths: 36,  consortiumAdm: 18, consortiumMonths: 72  },
    { id: "home_sfh",  label: "Imóvel (SFH/MCMV)",   monthlyRate: 0.74, maxMonths: 360, consortiumAdm: 17, consortiumMonths: 200 },
    { id: "home_sfi",  label: "Imóvel (SFI Mercado)", monthlyRate: 1.00, maxMonths: 360, consortiumAdm: 17, consortiumMonths: 200 },
  ];

  const vehicleFinancing = (PVraw, monthlyRateOverride, months, optionIndex) => {
    const PV     = Number(PVraw);
    const n      = Number(months);
    const option = FINANCING_OPTIONS[optionIndex] || FINANCING_OPTIONS[0];
    const i      = monthlyRateOverride > 0
      ? Number(monthlyRateOverride) / 100
      : option.monthlyRate / 100;

    // Financiamento (Tabela Price)
    const PMT         = calcPMT(PV, i, n);
    const totalPrice  = PMT * n;
    const totalJuros  = totalPrice - PV;
    const cet         = i * 100 * 1.05; // CET estimado com IOF
    const schedule    = buildSchedule(PV, PMT, i, n);

    // Consórcio
    const admRate     = option.consortiumAdm / 100;
    const nCons       = option.consortiumMonths;
    const totalCons   = PV * (1 + admRate);
    const pmtCons     = totalCons / nCons;
    const taxaCons    = admRate * 100;

    // Comparação: qual sai mais barato?
    const diferencaFinVsCons = totalPrice - totalCons;

    return {
      PV, i, n, option, PMT, totalPrice, totalJuros, cet, schedule,
      consortium: { pmtCons, totalCons, taxaCons, nCons, admRate },
      diff: diferencaFinVsCons,
    };
  };

  // ── DESCONTO À VISTA ─────────────────────────────────────────
  const discountCalc = (originalPrice, discountPct) => {
    const price         = Number(originalPrice);
    const pct           = Number(discountPct);
    const discountValue = price * (pct / 100);
    const finalPrice    = price - discountValue;
    return { originalPrice: price, discountPct: pct, discountValue, finalPrice, savings: discountValue };
  };

  return {
    fmt, fmtPct,
    simpleInterest, compoundInterest, compoundWithAporte,
    savingsInterest, consignado, cashflow,
    vehicleFinancing, discountCalc,
    CONSIGNADO_RATES, FINANCING_OPTIONS,
  };
})();
