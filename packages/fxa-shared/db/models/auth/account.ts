/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AuthBaseModel } from './auth-base';
import { Email } from './email';
import { Device } from './device';

export class Account extends AuthBaseModel {
  public static tableName = 'accounts';
  public static idColumn = 'uid';

  protected $uuidFields = ['uid'];

  public uid!: string;
  public createdAt!: number;
  public locale!: string;
  public email!: string;
  public emailVerified!: boolean;
  public normalizedEmail!: string;
  public verifierSetAt!: number;
  public lockedAt!: number;
  public devices?: Device[];
  public emails?: Email[];

  public static relationMappings = {
    emails: {
      join: {
        from: 'accounts.uid',
        to: 'emails.uid',
      },
      modelClass: Email,
      relation: AuthBaseModel.HasManyRelation,
    },
    devices: {
      join: {
        from: 'accounts.uid',
        to: 'devices.uid',
      },
      modelClass: Device,
      relation: AuthBaseModel.HasManyRelation,
    },
  };
}
