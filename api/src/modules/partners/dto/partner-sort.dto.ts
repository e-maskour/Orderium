/**
 * Sort whitelist for `GET /partners`. The list endpoint binds individual
 * `@Query` params (not a DTO), so these enums back `ParseEnumPipe` instead of
 * class-validator decorators.
 */
export enum PartnerSortField {
  NAME = 'name',
  PHONE_NUMBER = 'phoneNumber',
  EMAIL = 'email',
  DATE_CREATED = 'dateCreated',
}

export enum PartnerSortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
