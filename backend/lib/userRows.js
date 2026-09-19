// Maps between the nested user object the app uses ({ verification, address }) and the flat
// columns of the `users` table, so routes and services don't need to know about SQL.

const dropNull = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value != null));

export function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    bio: row.bio ?? '',
    avatarUpdatedAt: row.avatar_updated_at ?? null,
    verification: dropNull({
      status: row.identity_status,
      reason: row.identity_reason,
      code: row.identity_code,
      method: row.identity_method,
      verifiedAt: row.identity_verified_at,
      legalName: row.legal_name,
      dateOfBirth: row.date_of_birth,
      idType: row.id_type,
      idLast4: row.id_last4,
      idHash: row.id_hash
    }),
    address: dropNull({
      status: row.address_status,
      reason: row.address_reason,
      code: row.address_code,
      method: row.address_method,
      verifiedAt: row.address_verified_at,
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.address_city,
      state: row.address_state,
      zip: row.address_zip
    })
  };
}

// Named parameters for the identity columns; missing fields become NULL.
export function verificationParams(verification = {}) {
  return {
    identity_status: verification.status ?? "unverified",
    identity_reason: verification.reason ?? null,
    identity_code: verification.code ?? null,
    identity_method: verification.method ?? null,
    identity_verified_at: verification.verifiedAt ?? null,
    legal_name: verification.legalName ?? null,
    date_of_birth: verification.dateOfBirth ?? null,
    id_type: verification.idType ?? null,
    id_last4: verification.idLast4 ?? null,
    id_hash: verification.idHash ?? null
  };
}

// Named parameters for the address columns; missing fields become NULL.
export function addressParams(address = {}) {
  return {
    address_status: address.status ?? "unverified",
    address_reason: address.reason ?? null,
    address_code: address.code ?? null,
    address_method: address.method ?? null,
    address_verified_at: address.verifiedAt ?? null,
    address_line1: address.line1 ?? null,
    address_line2: address.line2 ?? null,
    address_city: address.city ?? null,
    address_state: address.state ?? null,
    address_zip: address.zip ?? null
  };
}

export const INSERT_USER_SQL = `
  INSERT INTO users (
    id, name, email, password_hash, created_at,
    identity_status, identity_reason, identity_code, identity_method, identity_verified_at,
    legal_name, date_of_birth, id_type, id_last4, id_hash,
    address_status, address_reason, address_code, address_method, address_verified_at,
    address_line1, address_line2, address_city, address_state, address_zip
  ) VALUES (
    @id, @name, @email, @password_hash, @created_at,
    @identity_status, @identity_reason, @identity_code, @identity_method, @identity_verified_at,
    @legal_name, @date_of_birth, @id_type, @id_last4, @id_hash,
    @address_status, @address_reason, @address_code, @address_method, @address_verified_at,
    @address_line1, @address_line2, @address_city, @address_state, @address_zip
  )`;

export function userToParams(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    created_at: user.createdAt,
    ...verificationParams(user.verification),
    ...addressParams(user.address)
  };
}
