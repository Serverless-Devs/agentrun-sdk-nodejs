import { Config } from '../../src/utils/config';
import { DataAPI, ResourceType } from '../../src/utils/data-api';
import {
  HTTPError,
  ResourceAlreadyExistError,
  ResourceNotExistError,
} from '../../src/utils/exception';
import {
  listAllResourcesFunction,
  updateObjectProperties,
} from '../../src/utils/resource';

describe('utils - config', () => {
  test('config defaults and data/control/devs endpoints and accountId error', () => {
    // ensure we don't rely on external environment variables for accountId test
    const cfg = new Config({ regionId: 'cn-test', accountId: 'explicit' });
    expect(cfg.regionId).toBe('cn-test');
    expect(cfg.timeout).toBe(600000);
    expect(cfg.readTimeout).toBe(100000000);
    // controlEndpoint default builds from region
    expect(cfg.controlEndpoint).toContain('agentrun.cn-test.aliyuncs.com');

    // when accountId explicitly set to empty string, getter should throw
    const cfgNoAccount = new Config({ regionId: 'cn-test', accountId: '' });
    expect(() => cfgNoAccount.accountId).toThrow();
  });

  test('withConfigs merge and headers merging', () => {
    // avoid asserting on accessKey values because CI/dev environment may set env vars
    const a = new Config({ accessKeyId: 'a', headers: { a: '1' } });
    const b = new Config({ accessKeySecret: 's', headers: { b: '2' } });
    const merged = Config.withConfigs(a, b);
    expect(merged.headers).toMatchObject({ a: '1', b: '2' });
  });
});

describe('utils - exception', () => {
  test('HTTPError toResourceError branches', () => {
    const e404 = new HTTPError(404, 'not');
    const r = e404.toResourceError('foo', 'id');
    expect(r).toBeInstanceOf(ResourceNotExistError);

    const e409 = new HTTPError(409, 'conflict');
    const r2 = e409.toResourceError('foo');
    expect(r2).toBeInstanceOf(ResourceAlreadyExistError);

    const e400 = new HTTPError(400, 'already exists somewhere');
    const r3 = e400.toResourceError('x');
    expect(r3).toBeInstanceOf(ResourceAlreadyExistError);

    const eOther = new HTTPError(418, "I'm a teapot");
    const r4 = eOther.toResourceError('x');
    expect(r4).toBe(eOther);
  });
});

describe('utils - resource helpers', () => {
  test('updateObjectProperties only copies data fields', () => {
    const target: any = {};
    const src: any = { a: 1, b: () => 2, _c: 3 };
    updateObjectProperties(target, src);
    expect(target.a).toBe(1);
    expect(target.b).toBeUndefined();
    expect(target._c).toBeUndefined();
  });

  test('listAllResourcesFunction paginates and dedups', async () => {
    // listAllResourcesFunction uses a pageSize of 50 internally.
    // To exercise pagination we return 50 items on first call and a small last page on second.
    const firstPage = Array.from({ length: 50 }, (_, i) => ({
      uniqIdCallback: () => `${i + 1}`,
    }));
    const secondPage = [
      { uniqIdCallback: () => '50' },
      { uniqIdCallback: () => '51' },
    ];
    const pages = [firstPage, secondPage];
    let called = 0;
    const list = async (params?: any) => {
      return pages[called++] || [];
    };

    const all = listAllResourcesFunction(list as any);
    const res = await all({});
    // expect unique ids from 1..51 -> 51 results
    expect(res.length).toBe(51);
  });
});

describe('utils - data-api small surface', () => {
  test('withPath merges queries and arrays', () => {
    const cfg = new Config({ token: 't', accountId: 'acct' });
    const d = new DataAPI('name', ResourceType.Runtime, cfg, 'ns');
    const url = d.withPath('/some/path', { a: [1, 2], b: 'x' });
    expect(url).toContain('a=1');
    expect(url).toContain('a=2');
    expect(url).toContain('b=x');
  });

  test('prepareRequest handles body types and sets token header', async () => {
    const cfg = new Config({ token: 'tok', accountId: 'acct' });
    const d = new DataAPI('name', ResourceType.Runtime, cfg, 'ns') as any;

    const r1 = await d.prepareRequest(
      'POST',
      'https://example.com/x',
      { a: 1 },
      { H: 'v' }
    );
    expect(r1.body).toBeDefined();
    expect(r1.headers['Agentrun-Access-Token']).toBe('tok');

    const r2 = await d.prepareRequest(
      'PUT',
      'https://example.com/x',
      Buffer.from('hi'),
      {}
    );
    expect(Buffer.isBuffer(r2.body)).toBe(true);

    const r3 = await d.prepareRequest(
      'PATCH',
      'https://example.com/x',
      'rawtext',
      {}
    );
    expect(r3.body).toBe('rawtext');
  });
});
