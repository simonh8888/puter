/**
 * Copyright (C) 2024 Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import UIWindowThemeDialog from '../UIWindowThemeDialog.js';
import UIWindowDesktopBGSettings from '../UIWindowDesktopBGSettings.js';

// About
export default {
    id: 'personalization',
    title_i18n_key: 'personalization',
    icon: 'palette-outline.svg',
    html: () => {
        return `
            <h1>${i18n('personalization')}</h1>
            <div class="settings-card">
                <strong>${i18n('background')}</strong>
                <div style="flex-grow:1;">
                    <button class="button change-background" style="float:right;">${i18n('change')}</button>
                </div>
            </div>
            <div class="settings-card">
                <strong>${i18n('ui_colors')}</strong>
                <div style="flex-grow:1;">
                    <button class="button change-ui-colors" style="float:right;">${i18n('change')}</button>
                </div>
            </div>
            <div class="settings-card">
                <strong style="flex-grow:1;">${i18n('clock_visibility')}</strong>
                <select class="change-clock-visible" style="margin-left: 10px; max-width: 300px;">
                    <option value="auto">${i18n('clock_visible_auto')}</option>
                    <option value="hide">${i18n('clock_visible_hide')}</option>
                    <option value="show">${i18n('clock_visible_show')}</option>
                </select>
            </div>
            <div class="settings-card" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                <div style="flex:1; min-width:0;">
                    <strong style="display:block; margin-bottom:8px;">${i18n('autohide_toolbar')}</strong>
                </div>
                <label class="toggle-switch" for="toggle_toolbar_autohide" style="margin:0;">
                    <input type="checkbox" id="toggle_toolbar_autohide">
                    <span class="toggle-slider" aria-hidden="true"></span>
                </label>
            </div>
            `;
    },
    init: ($el_window) => {
        $el_window.find('.change-ui-colors').on('click', function (e) {
            UIWindowThemeDialog({
                window_options:{
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });
        $el_window.find('.change-background').on('click', function (e) {
            UIWindowDesktopBGSettings({
                window_options:{
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.on('change', 'select.change-clock-visible', function(e){
            window.change_clock_visible(this.value);
        });

        window.change_clock_visible();

        // Toolbar autohide toggle (new: ON = autohide enabled by default)
        (async () => {
            try{
                const autohideKey = 'user_preferences.toolbar_autohide';

                // Read explicit autohide preference only. Default: ON
                const rawAutohide = await puter.kv.get(autohideKey);

                let autohideEnabled;
                if(rawAutohide !== undefined && rawAutohide !== null && rawAutohide !== ''){
                    if(rawAutohide === '1' || rawAutohide === 1 || rawAutohide === true || String(rawAutohide).toLowerCase() === 'true'){
                        autohideEnabled = true;
                    }else if(rawAutohide === '0' || rawAutohide === 0 || String(rawAutohide).toLowerCase() === 'false'){
                        autohideEnabled = false;
                    }else{
                        autohideEnabled = !!rawAutohide;
                    }
                }else{
                    autohideEnabled = true;
                }

                $el_window.find('#toggle_toolbar_autohide').prop('checked', autohideEnabled);

                // apply to toolbar immediately
                if(!autohideEnabled){
                    // autohide disabled -> ensure toolbar is visible and persistent
                    $('.toolbar').removeClass('toolbar-hidden').addClass('toolbar-persistent-visible');
                }else{
                    // autohide enabled -> clear persistent-visible so autohide logic applies
                    $('.toolbar').removeClass('toolbar-persistent-visible');
                }

                $el_window.on('change', '#toggle_toolbar_autohide', async function(){
                    const val = $(this).is(':checked');
                    try{
                        // persist the explicit autohide preference
                        // store '1' for enabled, '0' for explicitly disabled
                        await puter.kv.set(autohideKey, val ? '1' : '0');
                    }catch(e){
                        console.error('Failed saving toolbar autohide preference', e);
                    }

                    if(val){
                        // autohide enabled — remove persistent-visible and schedule hide
                        $('.toolbar').removeClass('toolbar-hidden toolbar-persistent-visible');
                        // If the autohide module exposes scheduleHide, call it; otherwise fallback to timeout
                        try{
                            if(window._toolbarAutohide && typeof window._toolbarAutohide.scheduleHide === 'function'){
                                window._toolbarAutohide.scheduleHide();
                            }else{
                                // fallback: schedule a hide after 2s unless user is hovering
                                setTimeout(() => {
                                    if(!$('.toolbar').is(':hover'))
                                        $('.toolbar').addClass('toolbar-hidden');
                                }, 2000);
                            }
                        }catch(e){
                            // noop
                        }
                    }else{
                        // autohide disabled -> show toolbar persistently
                        $('.toolbar').removeClass('toolbar-hidden').addClass('toolbar-persistent-visible');
                    }
                });
            }catch(e){
                console.error('Error initializing toolbar autohide toggle', e);
            }
        })();
    },
};
