const spacingLib = (function () {
    return function() {
        let appliedTargets = null; // elements affected by auto-apply

        /** ------------------------------------------------------------
         *   CREATE A SINGLE MARGIN/PADDING GROUP
         * -----------------------------------------------------------*/
        function create4InputGroup(title) {

            const $wrapper = $('<div class="wp-spacing-group"></div>');
            const $title = $('<div class="wp-spacing-title"></div>').text(title);

            // 🔗 LINKED BUTTON
            const $linkBtn = $('<button type="button" class="wp-spacing-link-btn"></button>')
                .attr("data-linked", "true")
                .text("🔗");

            // 📏 UNIT SELECTOR
            const $unitSelector = $(`
                <select class="wp-spacing-unit">
                    <option value="px">px</option>
                    <option value="%">%</option>
                </select>
            `);

            const $titleRow = $('<div class="wp-spacing-title-row"></div>');
            $titleRow.append($title, $unitSelector, $linkBtn);

            const $grid = $('<div class="wp-spacing-grid"></div>');

            const fields = [
                { label: 'Top', dir: 'top' },
                { label: 'Right', dir: 'right' },
                { label: 'Bottom', dir: 'bottom' },
                { label: 'Left', dir: 'left' }
            ];

            fields.forEach(f => {
                const $cell = $('<div class="wp-spacing-cell"></div>');
                const $label = $('<label></label>').text(f.label);
                const $input = $('<input type="text" class="wp-spacing-input">')
                    .attr('data-direction', f.dir);

                $cell.append($label, $input);
                $grid.append($cell);
            });

            /** ------------------------------------------------------------
             *   LIVE LINKING (input event)
             * -----------------------------------------------------------*/
            $grid.on("input", ".wp-spacing-input", function (event) {
                event.preventDefault();
                event.stopPropagation();
                const linked = $linkBtn.attr("data-linked") === "true";
                if (!linked) return;

                const val = $(this).val();
                $grid.find(".wp-spacing-input").val(val);
            });

            /** ------------------------------------------------------------
             *   CHANGE EVENT (fires afterwards)
             * -----------------------------------------------------------*/
            $grid.on("change", ".wp-spacing-input", function (event) {
                event.preventDefault();
                event.stopPropagation();

                const $input = $(this);
                const linked = $linkBtn.attr("data-linked") === "true";
                const dir = $input.data("direction");
                const val = $input.val();
                const unit = $unitSelector.val();

                // If linked, update all values
                if (linked) {
                    $grid.find(".wp-spacing-input").val(val);
                }

                // Custom spacing-change event
                const eventPayload = {
                    group: title,
                    direction: dir,
                    value: val,
                    unit: unit,
                    linked: linked
                };
                
                $wrapper.trigger("spacing-change", eventPayload);

                // Apply to preview if configured
                applyToPreview(eventPayload);
            });

            /** ------------------------------------------------------------
             *   LINK / UNLINK BUTTON
             * -----------------------------------------------------------*/
            $linkBtn.on("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                const linked = $(this).attr("data-linked") === "true";

                if (linked) {
                    $(this).attr("data-linked", "false").text("🔓");
                } else {
                    $(this).attr("data-linked", "true").text("🔗");

                    const firstVal = $grid.find(".wp-spacing-input").first().val();
                    $grid.find(".wp-spacing-input").val(firstVal);
                }
                $unitSelector.trigger('change');
            });

            /** ------------------------------------------------------------
             *   UNIT CHANGE → reapply automatically
             * -----------------------------------------------------------*/
            $unitSelector.on("change", function (event) {
                event.preventDefault();
                event.stopPropagation();
                const unit = $(this).val();

                // Apply each value again with the changed unit
                $grid.find(".wp-spacing-input").each(function () {
                    const e = {
                        group: title,
                        direction: $(this).data("direction"),
                        value: $(this).val(),
                        unit: unit,
                        linked: $linkBtn.attr("data-linked") === "true"
                    };

                    $wrapper.trigger("spacing-change", e);
                    applyToPreview(e);
                });
            });

            $wrapper.append($titleRow, $grid);
            return $wrapper;
        }


        /** ------------------------------------------------------------
         *   INIT FOR A CONTAINER
         * -----------------------------------------------------------*/
        function initSpacingControl($container) {

            if (!$container.length) return;

            const $margin = create4InputGroup("Margin");
            const $padding = create4InputGroup("Padding");
            const $row = $('<div class="wp-spacing-row"></div>');

            $row.append($margin, $padding);
            $container.append($row);
        }


        /** ------------------------------------------------------------
         *   AUTO-APPLY LOGIC
         * -----------------------------------------------------------*/
        function applyToPreview(data) {
            if (!appliedTargets) return;
            

            let cssProp = `${data.group.toLowerCase()}`;
            if (!data.linked) {
                cssProp = `${data.group.toLowerCase()}-${data.direction}`;
            }
            const finalValue = data.value + data.unit;

            appliedTargets.attr(`data-${cssProp}`, '');
            appliedTargets.attr(`data-${cssProp}`, finalValue);
        }

        /** ------------------------------------------------------------
         *   PUBLIC API: auto-apply to target
         * -----------------------------------------------------------*/
        function applyTo(selector) {
            appliedTargets = $(selector);
        }

        /** ------------------------------------------------------------
         *   LOAD EXISTING VALUES FROM data-* ATTRIBUTES
         * -----------------------------------------------------------*/
        function loadFromElement($wrapper, $target) {
            if (!$target || !$target.length) return;

            // CASE 1: configuring a box → look inside #spacing-wrapper
            let $container = $wrapper.closest('#config-box').find('#spacing-wrapper');
            // CASE 2: configuring a row → look inside row-wrapper
            if (!$container.length || $container.children().length === 0) {
                $container = $target.closest('.row-wrapper');
            }

            if (!$container.length) return;

            const $groups = $container.find('.wp-spacing-group');

            $groups.each(function() {
                const $group = $(this);
                const groupName = $group.find('.wp-spacing-title').text().toLowerCase(); // margin or padding
                const $unitSelector = $group.find('.wp-spacing-unit');
                const $inputs = $group.find('.wp-spacing-input');
                const $linkBtn = $group.find('.wp-spacing-link-btn');

                // Read existing data attributes
                let values = {};
                $inputs.each(function() {
                    const dir = $(this).data("direction");

                    // data-margin-left, data-padding-top, etc.
                    const attrVal = $target.attr(`data-${groupName}-${dir}`)
                                || $target.attr(`data-${groupName}`); // fallback (linked)

                    values[dir] = attrVal || "";
                });

                // Determine linked state:
                // - linked if all 4 values match
                // - linked if all are empty
                const vals = Object.values(values);

                // Check if ALL are empty → linked
                const allEmpty = vals.every(v => v === "");

                // Check if ALL are equal (and not empty)
                const allEqual = vals.every(v => v === vals[0]) && vals[0] !== "";

                // Final linked state
                const linked = allEmpty || allEqual;

                // Apply linked icon state
                $linkBtn
                    .attr("data-linked", linked ? "true" : "false")
                    .text(linked ? "🔗" : "🔓");

                // Fill input values
                $inputs.each(function() {
                    const dir = $(this).data("direction");
                    const v = values[dir];
                    if (!v) return;

                    const m = v.match(/^([0-9.]+)(px|%)?$/);
                    if (!m) return;

                    $(this).val(m[1]);
                    $unitSelector.val(m[2] || "px");
                });
            });
        }




        /** ------------------------------------------------------------
         *   PUBLIC METHODS
         * -----------------------------------------------------------*/
        return {
            initSpacingControl,
            applyTo,
            loadFromElement
        };
    }

})();

