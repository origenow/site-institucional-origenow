import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerConfig, headTracking } from '../../build/tracking.js';

// Os testes passam `{}` como padrão para não depender dos IDs versionados.

test('le os IDs do ambiente quando o formato e valido', () => {
  const cfg = lerConfig({
    GA_MEASUREMENT_ID: 'G-ABC123XYZ', GOOGLE_ADS_ID: 'AW-1234567890', GOOGLE_ADS_LEAD_LABEL: 'AbC_dEf-123',
  }, {});

  assert.equal(cfg.ga4, 'G-ABC123XYZ');
  assert.equal(cfg.ads, 'AW-1234567890');
  assert.equal(cfg.adsLead, 'AbC_dEf-123');
  assert.equal(cfg.gtm, '');
});

test('variavel vazia (ARG sem valor na Railway) cai no padrao versionado', () => {
  assert.equal(lerConfig({ GA_MEASUREMENT_ID: '' }, { ga4: 'G-PADRAO123' }).ga4, 'G-PADRAO123');
});

test('recusa ID malformado para nao injetar codigo no <head>', () => {
  assert.throws(() => lerConfig({ GA_MEASUREMENT_ID: 'G-1"</script><script>alert(1)' }, {}), /GA_MEASUREMENT_ID/);
  assert.throws(() => lerConfig({ GOOGLE_ADS_ID: '1234567890' }, {}), /GOOGLE_ADS_ID/);
});

test('exige GOOGLE_ADS_ID quando ha rotulo de conversao', () => {
  assert.throws(() => lerConfig({ GOOGLE_ADS_LEAD_LABEL: 'lead-teste' }, {}), /GOOGLE_ADS_ID/);
});

test('gera um unico <script> valido com host e IDs', () => {
  const cfg = lerConfig({ GA_MEASUREMENT_ID: 'G-ABC123XYZ' }, {});
  const head = headTracking(cfg, 'www.origenow.com.br');

  assert.match(head, /^<script id="om-tracking">/);
  assert.equal(head.match(/<\/script>/g).length, 1);
  assert.match(head, /"host":"www.origenow.com.br"/);
  assert.match(head, /"ga4":"G-ABC123XYZ"/);
  assert.match(head, /"padraoBot":"bot\|crawl/); // assinaturas de robô vão para o navegador
  assert.doesNotMatch(head, /google-site-verification/);

  const corpo = head.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => new Function(corpo)); // só faz o parse, não executa
});

test('monta as conversoes do Ads so com rotulo, com valor apenas no WhatsApp', () => {
  const cfg = lerConfig({
    GOOGLE_ADS_ID: 'AW-1234567890', GOOGLE_ADS_LEAD_LABEL: '9KRZCJL-__ccEM_ptuAB', GOOGLE_ADS_CONTACT_LABEL: 'whats-teste',
  }, {});
  const head = headTracking(cfg, 'www.origenow.com.br');

  assert.match(head, /"generate_lead":\{"send_to":"AW-1234567890\/9KRZCJL-__ccEM_ptuAB"\}/);
  assert.match(head, /"contact_whatsapp":\{"send_to":"AW-1234567890\/whats-teste","value":1,"currency":"BRL"\}/);
  assert.doesNotMatch(head, /"page_view":/); // sem rótulo, sem conversão
});

test('os IDs versionados de producao sao validos', () => {
  const cfg = lerConfig({});
  assert.equal(cfg.ga4, 'G-THYDSTFRER');
  assert.equal(cfg.gtm, 'GTM-K6D5X6B');
  assert.equal(cfg.ads, 'AW-470660303');
});

test('inclui a meta do Search Console quando configurada', () => {
  const cfg = lerConfig({ GOOGLE_SITE_VERIFICATION: 'abcdefghij_1234567890' }, {});
  assert.match(headTracking(cfg, 'www.origenow.com.br'),
    /^<meta name="google-site-verification" content="abcdefghij_1234567890">/);
});
