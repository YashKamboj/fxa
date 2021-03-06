/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import $ from 'jquery';
import { assert } from 'chai';
import BaseBroker from 'models/auth_brokers/base';
import BaseView from 'views/base';
import Metrics from 'lib/metrics';
import Notifier from 'lib/channels/notifier';
import sinon from 'sinon';
import TestHelpers from '../../../lib/helpers';
import Translator from 'lib/translator';
import User from 'models/user';
import View from 'views/settings/emails';
import WindowMock from '../../../mocks/window';

describe('views/settings/emails', function () {
  let account;
  let emails;
  let broker;
  let email;
  let metrics;
  let notifier;
  let parentView;
  let translator;
  const UID = '123';
  let user;
  let view;
  let windowMock;

  function initView() {
    view = new View({
      broker: broker,
      emails: emails,
      metrics: metrics,
      notifier: notifier,
      parentView: parentView,
      translator: translator,
      user: user,
      window: windowMock,
    });

    return view.render();
  }

  beforeEach(() => {
    broker = new BaseBroker();
    email = TestHelpers.createEmail();
    notifier = new Notifier();
    metrics = new Metrics({ notifier });
    parentView = new BaseView();
    translator = new Translator({ forceEnglish: true });
    user = new User();
    windowMock = new WindowMock();
    account = user.initAccount({
      email: email,
      sessionToken: 'abc123',
      uid: UID,
      verified: true,
    });

    emails = [];

    sinon.stub(user, 'getSignedInAccount').callsFake(() => {
      return account;
    });

    sinon.spy(metrics, 'logUserPreferences');
  });

  afterEach(() => {
    if ($.prototype.trigger.restore) {
      $.prototype.trigger.restore();
    }
    view.remove();
    view.destroy();

    view = null;
  });

  describe('constructor', () => {
    beforeEach(() => {
      view = new View({
        notifier: notifier,
        parentView: parentView,
        user: user,
      });
    });

    it('creates `Email` instances if passed in', () => {
      assert.ok(view._emails);
    });
  });

  describe('feature gated in unverified session', () => {
    beforeEach(() => {
      sinon.stub(account, 'sessionVerificationStatus').callsFake(() => {
        return Promise.resolve({ sessionVerified: false });
      });
    });

    describe('shows upgrade session', () => {
      beforeEach(() => {
        emails = [
          {
            email: 'primary@email.com',
            isPrimary: true,
            verified: true,
          },
        ];
        return initView();
      });

      it('has upgrade session panel', () => {
        assert.ok(view.$('.email-address .address').length, 1);
        assert.equal(view.$('.email-address .address').text(), email);
      });

      it('does not log any enable/disable metrics', function () {
        assert.isTrue(metrics.logUserPreferences.calledOnce);
      });
    });
  });

  describe('feature enabled', () => {
    beforeEach(() => {
      sinon.stub(account, 'recoveryEmails').callsFake(() => {
        return Promise.resolve(emails);
      });

      sinon.stub(account, 'sessionVerificationStatus').callsFake(() => {
        return Promise.resolve({ sessionVerified: true });
      });

      sinon
        .stub(account, 'recoveryEmailDestroy')
        .callsFake((destroyedEmail) => {
          emails = emails.filter((email) => email.email !== destroyedEmail);
          return Promise.resolve();
        });

      sinon.stub(account, 'resendEmailCode').callsFake(() => {
        return Promise.resolve();
      });

      sinon.stub(account, 'setPrimaryEmail').callsFake((newEmail) => {
        email = newEmail;
        return Promise.resolve();
      });
    });

    describe('with no secondary email', () => {
      beforeEach(() => {
        emails = [
          {
            email: 'primary@email.com',
            isPrimary: true,
            verified: true,
          },
        ];
        return initView();
      });

      it('has email input field', function () {
        assert.ok(view.$('input.new-email').length, 1);
        assert.ok(view.$('.email-add.primary-button').length, 1);
      });

      it('logs `emails` disabled metric', function () {
        assert.isTrue(metrics.logUserPreferences.calledOnce);
        assert.isTrue(
          metrics.logUserPreferences.calledWith(view.className, false)
        );
      });
    });

    describe('with unverified secondary email', () => {
      beforeEach(() => {
        emails = [
          {
            email: 'primary@email.com',
            isPrimary: true,
            verified: true,
          },
          {
            email: 'another@one.com',
            isPrimary: false,
            verified: false,
          },
        ];

        return initView().then(function () {
          // click events require the view to be in the DOM
          $('#container').html(view.el);
          sinon.spy(view, 'navigate');
          sinon.spy(view, 'displaySuccess');
        });
      });

      it('can render', () => {
        assert.equal(view.$('.email-address').length, 1);
        assert.lengthOf(view.$('.email-address .address'), 1);
        assert.equal(
          view.$('.email-address .address').html(),
          'another@one.com'
        );
        assert.equal(view.$('.email-address .details.not-verified').length, 1);
        assert.equal(
          view.$(
            '.email-address .email-address-row .settings-button.warning-button.email-disconnect'
          ).length,
          1
        );
        assert.equal(
          view.$('.email-address').attr('data-id'),
          'another@one.com'
        );
        assert.equal(
          view.$(
            '.email-address .email-address-row .settings-button.secondary-button.set-primary'
          ).length,
          0
        );
      });

      it('can disconnect email and navigate to /emails', (done) => {
        $(
          '.email-address .email-address-row .settings-button.warning-button.email-disconnect'
        ).click();
        setTimeout(function () {
          TestHelpers.wrapAssertion(() => {
            assert.isTrue(view.navigate.calledOnce);
            const args = view.navigate.args[0];
            assert.equal(args.length, 1);
            assert.equal(args[0], '/settings');
            assert.equal(view.displaySuccess.callCount, 1);
          }, done);
        }, 150);
      });

      it('calls `render` when refreshed', (done) => {
        $('.email-refresh').click();
        sinon.spy(view, 'render');
        setTimeout(function () {
          TestHelpers.wrapAssertion(() => {
            assert.isTrue(view.render.calledOnce);
          }, done);
        }, 450); // Delay is higher here because refresh has a min delay of 350
      });

      it('calls `render` when resend and navigate to /emails', (done) => {
        $('.resend').click();
        sinon.spy(view, 'render');
        setTimeout(function () {
          TestHelpers.wrapAssertion(() => {
            assert.isTrue(view.navigate.calledOnce);
            const args = view.navigate.args[0];
            assert.equal(args.length, 1);
            assert.equal(args[0], '/settings/emails');
          }, done);
        }, 150);
      });

      it('panel always open when unverified secondary email', () => {
        assert.equal(view.isPanelOpen(), true);
      });

      it('logs `emails` disabled metric', function () {
        assert.isTrue(metrics.logUserPreferences.calledOnce);
        assert.isTrue(
          metrics.logUserPreferences.calledWith(view.className, false)
        );
      });
    });

    describe('with verified secondary email', () => {
      beforeEach(() => {
        emails = [
          {
            email: 'primary@email.com',
            isPrimary: true,
            verified: true,
          },
          {
            email: 'another@one.com',
            isPrimary: false,
            verified: true,
          },
        ];

        return initView().then(function () {
          // click events require the view to be in the DOM
          $('#container').html(view.el);
          sinon.spy(view, 'navigate');
          sinon.spy(view, 'displaySuccess');
        });
      });

      it('can render', () => {
        assert.equal(view.$('.email-address').length, 1);
        assert.lengthOf(view.$('.email-address .address'), 1);
        assert.equal(
          view.$('.email-address .address').html(),
          'another@one.com'
        );
        assert.equal(view.$('.email-address .details.verified').length, 1);
        assert.equal(
          view.$(
            '.email-address .email-address-row .settings-button.warning-button.email-disconnect'
          ).length,
          1
        );
        assert.equal(
          view.$('.email-address').attr('data-id'),
          'another@one.com'
        );
      });

      it('panel closed when verified secondary email', () => {
        assert.equal(view.isPanelOpen(), false);
      });

      it('logs `emails` enabled metric', () => {
        assert.isTrue(metrics.logUserPreferences.calledOnce);
        assert.isTrue(
          metrics.logUserPreferences.calledWith(view.className, true)
        );
      });
    });

    describe('with multiple secondary emails', () => {
      beforeEach(() => {
        emails = [
          {
            email: 'primary@email.com',
            isPrimary: true,
            verified: true,
          },
          {
            email: 'another@one.com',
            isPrimary: false,
            verified: false,
          },
          {
            email: 'athird@one.com',
            isPrimary: false,
            verified: true,
          },
          {
            email: 'afourth@one.com',
            isPrimary: false,
            verified: false,
          },
        ];

        return initView().then(function () {
          // click events require the view to be in the DOM
          $('#container').html(view.el);
          sinon.spy(view, 'navigate');
          sinon.spy(view, 'displaySuccess');
        });
      });

      it('can render', () => {
        const emailGroups = view.$('.email-address');
        assert.equal(emailGroups.length, emails.length - 1);
        emailGroups.each((index, el) => {
          const emailGroup = $(el);
          const emailItem = emails[index + 1];
          assert.lengthOf(emailGroup.find('.address'), 1);
          assert.equal(emailGroup.find('.address').html(), emailItem.email);
          assert.equal(
            emailGroup.find(
              '.email-address-row .settings-button.warning-button.email-disconnect'
            ).length,
            1
          );
          assert.equal(emailGroup.attr('data-id'), emailItem.email);
          if (emailItem.verified) {
            assert.equal(emailGroup.find('.details.verified').length, 1);
            assert.equal(
              emailGroup.find(
                '.email-address-row .settings-button.secondary-button.set-primary'
              ).length,
              1
            );
          } else {
            assert.equal(emailGroup.find('.details.not-verified').length, 1);
          }
        });
      });

      it('can disconnect email and navigate to /emails', (done) => {
        $(
          '.email-address .email-address-row .settings-button.warning-button.email-disconnect'
        )
          .eq(0)
          .click();
        setTimeout(function () {
          TestHelpers.wrapAssertion(() => {
            // panel should not close after destroy when
            // you have multiple secondary emails
            assert.isTrue(view.navigate.notCalled);
          }, done);
        }, 150);
      });
    });

    describe('can change email', () => {
      const newEmail = 'secondary@email.com';
      beforeEach(() => {
        emails = [
          {
            email: 'primary@email.com',
            isPrimary: true,
            verified: true,
          },
          {
            email: 'anunverified@email.com',
            isPrimary: false,
            verified: false,
          },
          {
            email: 'anotherverified@email.com',
            isPrimary: false,
            verified: true,
          },
          {
            email: newEmail,
            isPrimary: false,
            verified: true,
          },
        ];

        sinon.spy(windowMock.history, 'replaceState');

        return initView().then(function () {
          // click events require the view to be in the DOM
          $('#container').html(view.el);
        });
      });

      it('can render', () => {
        const emailGroups = view.$('.email-address');
        assert.equal(emailGroups.length, emails.length - 1);
        emailGroups.each((index, el) => {
          const emailGroup = $(el);
          const emailItem = emails[index + 1];
          assert.lengthOf(emailGroup.find('.address'), 1);
          assert.equal(emailGroup.find('.address').html(), emailItem.email);
          assert.equal(
            emailGroup.find(
              '.email-address-row .settings-button.warning-button.email-disconnect'
            ).length,
            1
          );
          assert.equal(emailGroup.attr('data-id'), emailItem.email);
          if (emailItem.verified) {
            assert.equal(emailGroup.find('.details.verified').length, 1);
            assert.equal(
              emailGroup.find(
                '.email-address-row .settings-button.secondary-button.set-primary'
              ).length,
              1
            );
          } else {
            assert.equal(emailGroup.find('.details.not-verified').length, 1);
          }
        });
      });

      it('can set primary email', (done) => {
        const spy = sinon.spy(view, 'translate');
        // Find the third email
        $('.email-address')
          .eq(2)
          .find(
            '.email-address-row .settings-button.secondary-button.set-primary'
          )
          .click();
        setTimeout(() => {
          TestHelpers.wrapAssertion(() => {
            sinon.assert.calledWith(spy, 'Primary email set to %(email)s', {
              email: newEmail,
            });
            spy.restore();
            assert.equal(
              account.get('email'),
              newEmail,
              'account email updated'
            );
            assert.equal(
              account.get('originalLoginEmail'),
              undefined,
              'originalLoginEmail is unset'
            );

            // hey there, this fails if you view the test from
            // http://localhost:3030/tests/index.html?grep=views%2Fsettings%2Femails%20feature%20enabled%20can%20change%20email%20can%20set%20primary%20email
            // or somewhere that's not the root, because
            // '/?grep=[some test name]' would be part of the argument.
            assert.isTrue(
              windowMock.history.replaceState.calledOnceWith(
                {},
                '',
                '/?email=secondary%40email.com'
              )
            );
          }, done);
        }, 150);
      });
    });
  });
});
