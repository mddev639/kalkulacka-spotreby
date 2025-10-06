document.addEventListener('DOMContentLoaded', () => {
    // 1. Nastavenie Priebežného prepočtu pre všetky kľúčové vstupy
    const inputsToWatch = [
        'prikon', 'prikon-jednotka', 'cena', 'cena-jednotka', 
        'hodiny', 'minuty', 'frekvencia'
    ];
    inputsToWatch.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Reaguje na zmenu hodnoty (input) aj na zmenu výberu (change)
            element.addEventListener('input', vypocitajSpotrebu);
            element.addEventListener('change', vypocitajSpotrebu);
        }
    });

    // 2. Naviazanie na inputy v tabuľke výsledkov (pre vlastné obdobie)
    document.querySelectorAll('.period-input').forEach(input => {
        input.addEventListener('input', vypocitajSpotrebu);
        input.addEventListener('change', vypocitajSpotrebu);
    });
    
    // Spustí prvý prepočet ihneď po načítaní stránky s defaultnými hodnotami
    vypocitajSpotrebu(); 
});

// Pomocné konštanty
const dniVMesiaci = 30.4375; // Priemer na mesiac: 365.25 / 12
const dniVRoku = 365.25; 

// Pomocná funkcia pre správny tvar slova 'hodina' (1 hodina, 2 hodiny, 5 hodín)
function getGrammarHours(count) {
    if (count === 1) return 'hodinu';
    if (count >= 2 && count <= 4) return 'hodiny';
    return 'hodín';
}

// Pomocná funkcia pre správny tvar slova 'minúta' (1 minúta, 2 minúty, 5 minút)
function getGrammarMinutes(count) {
    if (count === 1) return 'minútu';
    if (count >= 2 && count <= 4) return 'minúty';
    return 'minút';
}


/**
 * Hlavná funkcia pre výpočet spotreby a ceny
 */
function vypocitajSpotrebu() {
    
    // 1. Získanie a normalizácia vstupov
    
    let prikon = parseFloat(document.getElementById('prikon').value) || 0;
    const prikonJednotka = document.getElementById('prikon-jednotka').value;
    
    let cenaVstup = parseFloat(document.getElementById('cena').value) || 0;
    const cenaJednotka = document.getElementById('cena-jednotka').value;
    
    // Získanie hodín A minút (zaokrúhlime nadol pre gramatické účely)
    const hodiny = Math.floor(parseFloat(document.getElementById('hodiny').value) || 0);
    const minuty = Math.floor(parseFloat(document.getElementById('minuty').value) || 0);
    const frekvencia = document.getElementById('frekvencia').value;

    // A) Celková doba zapnutia (v desatinných hodinách)
    const totalnaDobaZapnutia = hodiny + (minuty / 60);

    // B) Normalizovať príkon na kW
    let prikonKw = prikon;
    if (prikonJednotka === 'W') {
        prikonKw = prikon / 1000; // Konverzia W na kW
    }
    
    // C) Normalizovať cenu na €/kWh
    let cenaKWh = cenaVstup;
    if (cenaJednotka === 'MWh') {
        cenaKWh = cenaVstup / 1000; // Konverzia €/MWh na €/kWh
    }
    
    // D) Základná spotreba za 1 hodinu (kWh)
    let spotrebaZaHodinuKWh = prikonKw; 
    
    // Gramatické tvary pre textový výstup
    const hodinyGrammar = getGrammarHours(hodiny);
    const minutyGrammar = getGrammarMinutes(minuty);


    // E) Validácia (v prípade nulových hodnôt vynuluje výstupy)
    if (prikon <= 0 || cenaVstup <= 0 || totalnaDobaZapnutia <= 0) {
        const defaultText = '0.00 €';
        document.getElementById('mesacny-odhad').innerText = defaultText + '/mesiac';
        document.getElementById('rocny-odhad').innerText = defaultText + '/rok';
        document.getElementById('prikon-display').innerText = `${prikon} ${prikonJednotka}`;
        document.getElementById('hodiny-frekvencia-display').innerText = `${hodiny} ${hodinyGrammar} a ${minuty} ${minutyGrammar} ${frekvencia}`;
        document.querySelectorAll('.kwh-output').forEach(el => el.innerText = '0.000');
        document.querySelectorAll('.price-output').forEach(el => el.innerText = defaultText);
        return; 
    }


    // F) Výpočet celkového času zapnutia za mesiac a rok (berie do úvahy frekvenciu)
    let hodinyMesacne = 0;
    let hodinyRocne = 0;

    if (frekvencia === 'denne') {
        hodinyMesacne = totalnaDobaZapnutia * dniVMesiaci;
        hodinyRocne = totalnaDobaZapnutia * dniVRoku;
    } else if (frekvencia === 'tyzdenne') {
        hodinyMesacne = totalnaDobaZapnutia * (dniVMesiaci / 7); 
        hodinyRocne = totalnaDobaZapnutia * (dniVRoku / 7); 
    } else if (frekvencia === 'mesacne') {
        hodinyMesacne = totalnaDobaZapnutia; 
        hodinyRocne = totalnaDobaZapnutia * 12; 
    }

    // ******************************************************************
    // 2. ODHAD (Súhrnný text)
    // ******************************************************************
    
    const mesacnyOdhad = spotrebaZaHodinuKWh * hodinyMesacne * cenaKWh;
    const rocnyOdhad = spotrebaZaHodinuKWh * hodinyRocne * cenaKWh;
    
    // Formátovanie pre €/mesiac a €/rok
    const formatCenaOdhad = (value) => value.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    document.getElementById('mesacny-odhad').innerText = formatCenaOdhad(mesacnyOdhad) + ' €/mesiac';
    document.getElementById('rocny-odhad').innerText = formatCenaOdhad(rocnyOdhad) + ' €/rok';
    
    // Aktualizácia súhrnného textu s gramatikou
    document.getElementById('prikon-display').innerText = `${prikon} ${prikonJednotka}`; 
    document.getElementById('hodiny-frekvencia-display').innerText = 
        `${hodiny} ${hodinyGrammar} a ${minuty} ${minutyGrammar} ${frekvencia}`;

    // ******************************************************************
    // 3. DYNAMICKÁ TABUĽKA (Nepretržitá prevádzka)
    // ******************************************************************
    
    const formatKWh = (value) => value.toLocaleString('sk-SK', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); 
    const formatCena = (value) => value.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    
    document.querySelectorAll('#resultsTable tbody tr').forEach(row => {
        const inputElement = row.querySelector('.period-input');
        const periodUnit = inputElement.getAttribute('data-unit'); 
        const customValue = parseFloat(inputElement.value) || 0;
        
        let pocetHodin = 0;
        
        // Zistenie počtu hodín pre nepretržitú prevádzku
        if (periodUnit === 'hodina') {
            pocetHodin = customValue;
        } else if (periodUnit === 'den') {
            pocetHodin = customValue * 24;
        } else if (periodUnit === 'mesiac') {
            pocetHodin = customValue * dniVMesiaci * 24;
        } else if (periodUnit === 'rok') {
            pocetHodin = customValue * dniVRoku * 24;
        }
        
        // Výpočet pre dané obdobie (nepretržitá prevádzka)
        let spotreba = spotrebaZaHodinuKWh * pocetHodin;
        let cena = spotreba * cenaKWh;

        // Aktualizácia textu jednotky v tabuľke (gramatická správnosť)
        const unitSpan = row.querySelector('.period-unit');
        const units = { hodina: 'hodín', den: 'dní', mesiac: 'mesiace', rok: 'roky' };
        
        if (customValue === 1) {
             if (periodUnit === 'hodina') unitSpan.innerText = 'hodina';
             else if (periodUnit === 'den') unitSpan.innerText = 'deň';
             else if (periodUnit === 'mesiac') unitSpan.innerText = 'mesiac';
             else if (periodUnit === 'rok') unitSpan.innerText = 'rok';
        } else {
             unitSpan.innerText = units[periodUnit] || periodUnit;
        }
        
        // Zobrazenie výsledkov
        row.querySelector('.kwh-output').innerText = formatKWh(spotreba);
        row.querySelector('.price-output').innerText = formatCena(cena);
    });
}