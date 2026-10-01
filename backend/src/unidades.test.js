import test from 'node:test';
import assert from 'node:assert/strict';
import { aBase, desdeBase, convertir, mismaFamilia, unidadBase, esUnidad, ErrorUnidad } from './unidades.js';

test('a unidad base: compras en kg y l se guardan en gr y ml', () => {
  assert.equal(aBase(2, 'kg'), 2000);
  assert.equal(aBase(1.5, 'l'), 1500);
  assert.equal(aBase(250, 'gr'), 250);
  assert.equal(aBase(12, 'und'), 12);
});

test('desde unidad base: el stock se muestra en la unidad de compra', () => {
  assert.equal(desdeBase(2000, 'kg'), 2);
  assert.equal(desdeBase(300, 'kg'), 0.3);
  assert.equal(desdeBase(750, 'ml'), 750);
});

test('no quedan restos de punto flotante', () => {
  assert.equal(aBase(0.29, 'kg'), 290);
  assert.equal(aBase(0.1 + 0.2, 'kg'), 300);
  assert.equal(convertir(0.3, 'kg', 'gr'), 300);
});

test('convierte dentro de la misma familia', () => {
  assert.equal(convertir(250, 'gr', 'kg'), 0.25);
  assert.equal(convertir(1, 'l', 'ml'), 1000);
  assert.equal(convertir(5, 'und', 'und'), 5);
});

test('rechaza convertir entre familias distintas', () => {
  assert.throws(() => convertir(100, 'gr', 'ml'), ErrorUnidad);
  assert.throws(() => convertir(1, 'kg', 'und'), ErrorUnidad);
});

test('rechaza unidades que no existen', () => {
  assert.equal(esUnidad('kg'), true);
  assert.equal(esUnidad('libras'), false);
  assert.equal(esUnidad('toString'), false);
  assert.throws(() => aBase(1, 'libras'), ErrorUnidad);
});

test('familias y unidad base', () => {
  assert.equal(mismaFamilia('gr', 'kg'), true);
  assert.equal(mismaFamilia('gr', 'l'), false);
  assert.equal(unidadBase('kg'), 'gr');
  assert.equal(unidadBase('l'), 'ml');
  assert.equal(unidadBase('und'), 'und');
});
