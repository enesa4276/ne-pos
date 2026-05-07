// NOT: Bu dosya YALNIZCA bir referans/yedektir.
// Backend functions yerel import desteklemediği için her function dosyasında
// bu mantığı inline kopyalayarak kullanın. (createClientFromRequest sonrası)
//
// Standart akış:
//   const base44 = createClientFromRequest(req);
//   const user = await base44.auth.me();
//   const tenantId = await resolveTenantId(base44, user);
//
// Süper admin kullanıcılarda user.selected_tenant_id veya user.tenant_id kullanılır.
// Normal kullanıcılarda yalnızca user.tenant_id geçerlidir.
//
// Bu dosya doğrudan kullanılmayacak — sadece dökümantasyon amaçlıdır.
export const TENANT_RESOLVER_DOC = true;