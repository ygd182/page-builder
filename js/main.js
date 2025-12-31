(() => {
    let elementsContainer = null;
    let pageContainer = null;
    let draggedElement = null;
    let isCloned = false;
    let previewElement = null;
    let idCounter = 0;
    let selectedBox = null;
    let spacingInstances = new Map(); // Track spacing instances for cleanup

    function resetSelect() {
        const $selector = $("#box-selector");
        $selector.val(0);
    }

    function updateInputImgState(boxId) {
        const box = $(`.box[data-id='${boxId}']`)[0];
        const imgCount = $(box).find('img.box-image').length;
        const $selector = $("#image-selector");
        if (imgCount >= 1) {
            if ($(box).hasClass('slider')) {
                $("#image-upload").prop('disabled', false);
                $('#slider-config').show();
                $selector.val(2);
            } else {
                $("#image-upload").prop('disabled', true);
                $('#slider-config').hide();
                $selector.val(1);
            }
        } else {
            $("#image-upload").prop('disabled', false);
            $('#slider-config').hide();
        }
    }

    function createBox(boxData) {
        const box = document.createElement("div");
        box.className = `box col-${boxData.size}`;
        box.draggable = true;
        box.dataset.size = boxData.size;
        const header = document.createElement("div");
    
        header.textContent = `Box 1x${boxData.size}`;
        header.className = "box-header";
        box.appendChild(header);

        return box;
    }

    function addBoxEvent() {
        // Use jQuery event delegation on the specific selector to prevent listener accumulation
        $('#box-selector').off('change.boxEvent').on('change.boxEvent', ()=> {
            closeConfig();
            const selector = document.getElementById("box-selector");
            const size = selector.value;
            if(size) {
                elementsContainer.innerHTML = ""; // Clear existing box
                const box = createBox({size});
                elementsContainer.appendChild(box);
            }
        });
    }

    function sizeFitInRow(row, size) {
        let usedSpace = Array.from(row.children).reduce((sum, el) => sum + parseInt(el.dataset.size || 0), 0);
        return (usedSpace + parseInt(size) <= 4) 
    }

    function addRemoveButtonClickEvent(btn) {
        btn.on("click", () => {
            closeConfig();
            let box = btn.closest(".box")[0];
            let parentRow = box.parentNode;

            box.remove();
            if (parentRow.children.length === 0) {
                parentRow.remove();
            }

            ensureEmptyRow();
        });
    }
    
    function addRemoveButton(actions) {
        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "<i class='fa fa-times'></i>";
        removeBtn.classList.add("remove-btn");
		removeBtn.type = "button";
        addRemoveButtonClickEvent($(removeBtn));
        actions.appendChild(removeBtn);
    }

    function addNewRow() {
        closeConfig();
        const newRow = '<div class="row-wrapper"><div class="row-controls"><button type="button" class="move-up"><i class="fa fa-arrow-up"></i></button><button type="button" class="move-down"><i class="fa fa-arrow-down"></i></button><button type="button" class="row-remove-btn"><i class="fa fa-times"></i></button></div><div class="row"></div></div>';
        const $newRow = $(newRow);
      

        const $row = $newRow.find('.row');
        const spacingLibInstance = spacingLib();
        spacingLibInstance.initSpacingControl($newRow);
        spacingLibInstance.applyTo($row);
        spacingInstances.set($row[0], spacingLibInstance); // Track instance
        $('#page-container').append($newRow);
       
    }

    function deleteLastRow() {
        pageContainer.removeChild(pageContainer.lastElementChild);
    }
    
    function ensureEmptyRow() {
        let rows = pageContainer.querySelectorAll(".row");
        if (rows.length) {
            if(rows[rows.length - 1].children.length > 0) {
                addNewRow();
            } else {
                const previousRow = rows.length - 2 >= 0 ? rows[rows.length - 2] : null;
                if (rows.length > 1 && previousRow?.children.length === 0) {
                    deleteLastRow();
                }
            }
        } else {
            addNewRow();
        }
    }

    function positionInsideBox(event, boxClientRect) {
        const containsX = event.pageX >= boxClientRect.x && event.pageX <= (boxClientRect.x + boxClientRect.width);
        const containsY = event.pageY >= boxClientRect.y && event.pageY <= (boxClientRect.y + boxClientRect.height);
        return containsX && containsY;
    }

    function isNewBoxBefore(event, boxClientRect) {
        const containsX = event.pageX <= (boxClientRect.x + boxClientRect.width);
        return containsX;
    }

    function loadSliderConfig(box) {
        $('#secondsPerSlideInput').val(box.attr('data-seconds'));
        $('#randomizeOrderCheckbox').prop('checked', box.attr('data-randomize-order'));
    }

    function openConfig(box) {
        closeConfig();
        
        const id = box.dataset.id;
        
        let configBox = document.getElementById("config-box");
        configBox.setAttribute('data-box-id', id);
        let name = document.getElementById('box-name');
        name.innerHTML = 'Box ' + box.getAttribute('data-name');
        const $box = $(box);
        const imgCount = $box.find('img.box-image').length;
        const size = box.dataset.size;
        
        selectedBox = box;

        if (size == 4) {
            $('#image-selector').show();
        } else {
            $('#image-upload-wrapper').show();
        }
        if (imgCount > 0) {
            loadPreviewImages(id);
            if ($(box).hasClass('slider')) {
                loadSliderConfig($(box));
            }
            $('#toggleButton').removeClass('active');           
            $('#config-image').show();
            $('#config-text').hide();
        } else {
            loadTextAndBkg();
            $('#toggleButton').addClass('active');
            $('#config-text').show();
            $('#config-image').hide();
        }
        
        const fileReader = document.getElementById("image-upload");
        fileReader.value = null;

        configBox.className = '';
        const spacingEl = $(configBox).find('#spacing-wrapper');

        const spacingLibInstance = spacingLib();
        spacingLibInstance.initSpacingControl(spacingEl);
        spacingLibInstance.applyTo($box);
        spacingLibInstance.loadFromElement(spacingEl, $box);
        spacingInstances.set($box[0], spacingLibInstance); // Track instance
        updateInputImgState(id);
    }

    function loadPreviewImages(boxId) {
        const box = $(`.box[data-id='${boxId}']`)[0];
        $(box).find('img.box-image').each(function(index) {
            const imgData = {
                url: $(this).attr('src')
            };
            addPreviewImage(imgData, boxId, index);
        });
    }

    function addRemovePreviewButton(img, boxId, imgId) {
        const removeBtn = document.createElement("a");
        removeBtn.textContent = "Remove Image";
        removeBtn.classList.add("remove-img-link");
		removeBtn.type = "button";
        removeBtn.href = '';
        removeBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            img.parent().remove();
            updateInputImgState(boxId);
            const fileReader = document.getElementById("image-upload");
            fileReader.value = null;
            const box = $(`.box[data-id='${boxId}']`)[0];

            if (imgId === 0) {
                $(box).find("img.box-image").remove();
            } else {
                $(box).find("img.box-image").eq(imgId).remove();
            }
        });
        img.append(removeBtn);
    }

    function addImageLink(wrapper, boxId, imgId) {
			const input = $("<input type='url' class='input-link'>");
			var $box = $(`#box${boxId}`);
			var $img = $box.find("img[data-id=" + (imgId + 1) + "]");
			input[0].value = $img.attr('data-url') || '';
			input.on('change', (event)=> {
				var $box = $(`#box${boxId}`);
				$box.find("img[data-id=" + (imgId + 1) + "]").attr("data-url", $.trim(event.target.value));
				
				
                event.preventDefault();
				event.stopPropagation();
			});
            var $divLink = $("<div />").addClass("image-content-row")
				.append("<span>Link:</span>")
                .append(input);

			var $div = $("<div />");
			$div.append($divLink);
            var $box = $(`#box${boxId}`);
           
            const isSlider = $box.hasClass('slider');

            if (!isSlider) {
                //add toggle switch
                var $div2 = $("<div />").addClass("toggle-container")
                    .append("<span>Motion Off</span>")
                    .append("<div class=\"toggle toggle-motion\"></div>")
                    .append("<span>On</span>");

                var $box = $(`#box${boxId}`);
                var $img = $box.find("img[data-id=" + (imgId + 1) + "]");
                if ($img.attr('data-motion') === 'true'){
                    $div2.find("div.toggle-motion").addClass("active");
                }
                
                addConfigMotionToggleEvent($div2, boxId, imgId);
            }
            $div.append(getImageTitle(boxId, imgId));
            $div.append(getImageAlt(boxId, imgId));

            

			$div.append($div2)

            addRemovePreviewButton($div, boxId, imgId);
            $div.addClass('image-center-content');
			wrapper.append($div); //input
		}

        function getImageTitle(boxId, imgId) {
            const input = $("<input type='text' class='input-link'>");
            var $box = $(`#box${boxId}`);
            var $img = $box.find("img[data-id=" + (imgId + 1) + "]");
			input[0].value = $img.attr('data-title') || '';
			input.on('change', (event)=> {
                var $box = $(`#box${boxId}`);
                $box.find("img[data-id=" + (imgId + 1) + "]").attr("data-title", $.trim(event.target.value));
                event.preventDefault();
				event.stopPropagation();
            });
            var $div = $("<div />").addClass("image-content-row")
				.append("<span>Title:</span>")
                .append(input);

            return $div;
        }

        function getImageAlt(boxId, imgId) {
            const input = $("<input type='text' class='input-link'>");
            var $box = $(`#box${boxId}`);
            var $img = $box.find("img[data-id=" + (imgId + 1) + "]");
			input[0].value = $img.attr('data-alt') || '';
			input.on('change', (event)=> {
                var $box = $(`#box${boxId}`);
                $box.find("img[data-id=" + (imgId + 1) + "]").attr("data-alt", $.trim(event.target.value));
                event.preventDefault();
				event.stopPropagation();
            });

             var $div = $("<div />").addClass("image-content-row")
				.append("<span>Alt:</span>")
                .append(input);

            return $div;
        }

		function addConfigMotionToggleEvent($el, boxId, imgId) {
		$el.on("click", function(){
			var $toggle = $el.find("div.toggle-motion");
			var $box = $(`#box${boxId}`);
			var $img = $box.find("img[data-id=" + (imgId + 1) + "]");

			if ($toggle.hasClass("active")){
				$toggle.removeClass("active");
				$img.attr("data-motion", false);
			}
			else {
				$toggle.addClass("active");
				$img.attr("data-motion", true);
			}
		});
	}

    function addPreviewImage(imgFile, boxId, imgId) {
        const img = $('<img>');
        img.attr('src', imgFile.url);
        const wrapper = $('<div class="preview-item"></div>');
        const imgWrapper = $('<div></div>');
        imgWrapper.addClass('preview-img-wrapper');
        imgWrapper.append(img);
        wrapper.append(imgWrapper);
        
        addImageLink(wrapper, boxId, imgId);

        if( $('.img-preview-list').children().length === 0) {
            $('.img-preview-list').append('<div class="preview-item"><div>Image</div><div>Properties</div></div>');
        }
        $('.img-preview-list').append(wrapper);
        if ($('#image-upload-wrapper').is(':hidden')) {
            $('#image-upload-wrapper').show();
        }

    }

    function addTextContent(box, text) {
        const div = document.createElement('div');
        div.className = 'box-text';
        if (text) {
            div.textContent = text;
        }
        box.appendChild(div);
    }

    function moveRowUp(event) {
        event.preventDefault();
        event.stopPropagation();
        const row = event.target.closest(".row-wrapper");
        closeConfig();
        let prevRow = row.previousElementSibling;
        if (prevRow) {
            row.parentNode.insertBefore(row, prevRow);
        }
    }

    function moveRowDown(event) {
        event.preventDefault();
        event.stopPropagation();
        const row = event.target.closest(".row-wrapper");
        closeConfig();
        let nextRow = row.nextElementSibling;
        if (nextRow) {
            row.parentNode.insertBefore(nextRow, row);
        }
    }

    function closeConfig() {
        // Destroy CKEditor instance to prevent memory leak
        if (CKEDITOR.instances["text-input"]) {
            CKEDITOR.instances["text-input"].destroy(true);
        }
        
        $('.img-preview-list').html('');
        let configBox = document.getElementById("config-box");
        configBox.setAttribute('data-box-id', null);
        let name = document.getElementById('box-name');
        name.innerHTML = '';
        configBox.className = 'hidden';
        $("#image-upload").prop('disabled', false)
        selectedBox = null;
        const fileReader = document.getElementById("image-upload");
        fileReader.value = null;
        $('#text-input')[0].value = null;
        $('#config-image').show();
        $('#config-text').hide();
        $('#toggleButton').removeClass('active');
        closeImageSelector();
        closeResetSliderConfig();
        $('#spacing-wrapper').empty();
        $('#config-bkg-img').hide();
    }

    function closeImageSelector() {
        singleImage = true;
        $('#image-selector').hide();
        $('#image-upload-wrapper').hide();
    }

    function rgbToHex(color) {
        if (!color) return null;

        const match = color
            .replace(/\s+/g, '')
            .match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);

        if (!match) return null;

        let r = parseInt(match[1], 10);
        let g = parseInt(match[2], 10);
        let b = parseInt(match[3], 10);
        let a = match[4] !== undefined
            ? Math.round(parseFloat(match[4]) * 255)
            : null;

        const toHex = v => v.toString(16).padStart(2, '0');

        return (
            '#' +
            toHex(r) +
            toHex(g) +
            toHex(b) +
            (a !== null ? toHex(a) : '')
        );
    }

    function loadTextAndBkg() {
        const boxId = $('#config-box').attr('data-box-id');
        const box = $(`#box${boxId}`);
        const bkgColor = rgbToHex(box.css('backgroundColor')) || '#FFFFFF';
        $('.bkg-color-input').val(bkgColor);
        const html = box.find('.box-text')

        // Ensure CKEditor instance exists before using it
        ensureCKEditor();

        if (html.html()){
       
            $('#text-input')[0].value = html.html();
            CKEDITOR.instances["text-input"].setData(html.html());
        }
        else {
            $('#text-input')[0].value = "";
            CKEDITOR.instances["text-input"].setData("");
        }
    }

    function resetBox() {
        // Destroy CKEditor instance before reset
        if (CKEDITOR.instances["text-input"]) {
            CKEDITOR.instances["text-input"].destroy(true);
        }
        
        const boxId = $('#config-box').attr('data-box-id');
        const box = $(`#box${boxId}`);
        box.find("img.box-image").remove();
        box.children('.box-text')[0].textContent = '';
        box[0].style.color = '';
        box[0].style.backgroundColor = '';
        $('#text-input')[0].value = '';
        removeBoxAttr('data-seconds');
        removeBoxAttr('data-randomize-order');
        box.removeClass('slider');
    }

    function resetConfigBox() {
        const fileReader = document.getElementById("image-upload");
        fileReader.value = null;
       	$('#text-input')[0].value = null;
        
        // Ensure CKEditor exists before using it
        ensureCKEditor();
        CKEDITOR.instances["text-input"].setData("");
        
        $('.img-preview-list').html('');
        if (selectedBox) {
            updateInputImgState(selectedBox.dataset.id);
        }
        closeResetSliderConfig();
    }

    function addImageUploadEvent() {
        document.getElementById("image-upload").addEventListener("change", (event) => {
            if (selectedBox && event.target.files.length > 0) {

                let file = event.target.files[0];
                var formData = new FormData();

                //TODO to remove this line
                var Cookies = {get: (param)=> 'token'};

                formData.append("section", "content-page");
                formData.append("formFileFieldName", "uploadedFile");
                formData.append("CSRFToken", Cookies?.get("CSRF"));

                formData.append("uploadedFile", file); // "uploadedFile" is the name ColdFusion will expect

                $.ajax({
                    type: "POST",
                    data: formData,
                    processData: false, // Important for file uploads
                    contentType: false, // Important for file uploads
                    url: "cfc/file.cfc?method=upload",
                    success: function(response) {
                        console.log(response);

                        if (response.success == true){
                            var $box = $("#" + selectedBox.id);
                            var nextImgId = $box.find("img.box-image").length + 1;
                            $img = $("<img />").attr("src", response.url)
                                .addClass("box-image")
                                .attr("data-url", "")
                                .attr("data-motion", false)
                                .attr("data-alt", "")
                                .attr("data-title", "")
                                .attr("data-id", nextImgId);

                            var $box = $("#" + selectedBox.id);
                            //$box.find("img.box-image").remove();
                            $box.append($img);
                            addPreviewImage({file, url: response.url},selectedBox.dataset.id, nextImgId - 1);
                            updateInputImgState(selectedBox.dataset.id);
                        }
                        else {
                            alert(response.message);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.log("fail");
                        console.log(arguments);
                        //imageErrorHardcodedUpload(file);
                    }
                });
            }
            event.preventDefault();
            event.stopPropagation();
        });
    }

    function imageErrorHardcodedUpload(file) {
        //TODO to remove these lines when integrating back to the admin
        var response = { url: 'https://demo-dev2.omnisourcegear.com/OVERRIDES/Omni.demo/storage/home/5-20241106-100659567-1920x6501.jpg'}
        var $box = $("#" + selectedBox.id);
        var nextImgId = $box.find("img.box-image").length + 1;
        $img = $("<img />").attr("src", response.url)
                .addClass("box-image")
                .attr("data-url", "")
                .attr("data-motion", false)
                .attr("data-alt", "")
                .attr("data-title", "")
                .attr("data-id", nextImgId);

            var $box = $("#" + selectedBox.id);
    //          $box.find("img.box-image").remove();
            $box.append($img);
        addPreviewImage({file, url: response.url},selectedBox.dataset.id, nextImgId - 1);
        updateInputImgState(selectedBox.dataset.id);
    }


    function dragStartHandler(event) {
        closeConfig();
        if (event.target.classList.contains("box")) {
            draggedElement = event.target;
            isCloned = draggedElement.parentNode === elementsContainer;
            event.dataTransfer.setData("text/plain", "");
            setTimeout(() => draggedElement.style.visibility = "hidden", 0);
        }
    }

    function dragEndHandler() {
        if (draggedElement) {
            draggedElement.style.visibility = "visible";
            draggedElement = null;
        }
        if (previewElement.parentNode) {
            previewElement.remove();
        }
    }

    function dragOverHandler(event) {
        event.preventDefault();
        if (!draggedElement) return;

        let size = draggedElement.dataset.size;
        let targetRow = event.target.closest(".row");

        if (!targetRow) {
            if (previewElement.parentNode) {
                previewElement.remove();
            }
            return;
        }
        if (positionInsideBox(event, draggedElement.getBoundingClientRect())) { 
            if (previewElement.parentNode) {
                previewElement.remove();
            }
        } else {
    
            let targetBox = event.target.closest(".box");

            if (targetRow === draggedElement.parentNode && targetBox && targetBox !== draggedElement) {
                let boxes = Array.from(targetRow.children);
                let draggedIndex = boxes.indexOf(draggedElement);
                let targetIndex = boxes.indexOf(targetBox);

                if (draggedIndex !== targetIndex) {
                    previewElement.className = `preview col-${size}`;
                    targetRow.insertBefore(previewElement, targetIndex > draggedIndex ? targetBox.nextSibling : targetBox);
                }
            } else {
                if (sizeFitInRow(targetRow, size) && targetRow !== draggedElement.parentNode) {
                    if (!previewElement.parentNode || previewElement.parentNode !== targetRow) {
                        previewElement.className = `preview col-${size}`;
                        targetRow.appendChild(previewElement);
                    } else {
                        let boxes = Array.from(targetRow.children);
                        targetBox = event.target.closest(".box");
                        if (targetBox && isNewBoxBefore(event, targetBox?.getBoundingClientRect())) {
                            previewElement.className = `preview col-${size}`;
                            targetRow.insertBefore(previewElement, targetBox);
                        } else {
                            let draggedIndex = boxes.indexOf(draggedElement);
                            let targetIndex = boxes.indexOf(targetBox);

                            if (draggedIndex !== targetIndex) {
                                previewElement.className = `preview col-${size}`;
                                targetRow.insertBefore(previewElement, targetIndex > draggedIndex ? targetBox.nextSibling : targetBox);
                            }
                        }
                    }
                }
            }
        }
    }

    function dropBoxHandler(event) {
        event.preventDefault();
        if (!draggedElement || !previewElement.parentNode) return;

        let newElement = draggedElement;
        if (isCloned) {
            newElement = draggedElement.cloneNode(true);
            newElement.style.visibility = "visible";
            newElement.dataset.size = draggedElement.dataset.size;
            newElement.dataset.id = idCounter;
            newElement.id = `box${idCounter}`;
            newElement.className = `box col-${draggedElement.dataset.size}`;
            const header = newElement.getElementsByClassName('box-header');
            header[0].textContent = `Box 1x${draggedElement.dataset.size} ID: ${idCounter}`;
            newElement.setAttribute('data-name', idCounter);
            newElement.draggable = true;
            const actionsDiv = document.createElement("div");
            actionsDiv.className = "box-actions";
            newElement.appendChild(actionsDiv);
            addRemoveButton(actionsDiv);
            addTextContent(newElement);
            idCounter++;
            draggedElement.remove(); // Remove from elements-container
            resetSelect();
        }


        if (previewElement.parentNode) {
            previewElement.parentNode.replaceChild(newElement, previewElement);
        }

        ensureEmptyRow();
    }

    function addDragEvents() {
        document.addEventListener("dragstart", (event) => dragStartHandler(event));
        document.addEventListener("dragend", () => dragEndHandler());
        pageContainer.addEventListener("dragover", (event) => dragOverHandler(event));
        pageContainer.addEventListener("drop", (event) => dropBoxHandler(event));
    }

    function removeRow(event) {
        closeConfig();
        const rowWrapper = event.target.parentNode.parentNode;
        const $row = $(rowWrapper).find('.row');
        
        // Clean up spacing instance
        if ($row.length && spacingInstances.has($row[0])) {
            const instance = spacingInstances.get($row[0]);
            if (instance && typeof instance.destroy === 'function') {
                instance.destroy();
            }
            spacingInstances.delete($row[0]);
        }
        
        rowWrapper.remove();
    }

    function addConfigTextChange() {
        document.getElementById("text-input").addEventListener("change", (event) => {
            const boxId = $('#config-box').attr('data-box-id');
            const box = $(`#box${boxId}`);
            box.children('.box-text')[0].innerHTML = event.target.value;
            
            event.stopPropagation();
        });

    }

    function addConfigToggleEvent() {
        document.getElementById("toggleButton").addEventListener("click", function(event) {
            this.classList.toggle("active");
            if (this.classList.contains('active')) {
                $('#config-text').show();
                $('#config-image').hide();
                resetImageSelect();
            } else {
                $('#config-image').show();
                $('#config-text').hide();
            }
            resetBox();
            resetConfigBox();
            event.stopPropagation();
        });
    }

    function addNewRowEvent() {
        $(document).on('click', '#add-row-btn', () => addNewRow());
    }

    function addSaveEvent() {
        $(document).on('click', '#save-btn', () => {
         
            // Open a new, blank window
            const newWindow = window.open('', '_blank');

            // Check if the new window was successfully opened
            if (newWindow) {
                // Get the document object of the new window
                const newDoc = newWindow.document;

                // Write the dynamic HTML content to the new document
                newDoc.write(generateOutputPage().html());
                newDoc.body.classList.add("page-builder");
                
                const cssLink = newWindow.document.createElement("link");
                cssLink.rel = "stylesheet";
                cssLink.type = "text/css";
                cssLink.href = "../page-builder/css/styles.css"; // Replace with the actual path to your CSS file
                newDoc.head.appendChild(cssLink);
            }
        });
    }

    function addLoadEvent() {
        
        $(document).on('click', '#load-btn', (event) => {
            closeConfig();
            pageContainer.innerHTML = '';
            idCounter = 0;
            selectedBox = null;
            event.preventDefault();
            event.stopPropagation();
            const $editablePreview = generateEditableLivePreview();
            idCounter = $editablePreview.find('.box').length;
            pageContainer.innerHTML = '';
            $(pageContainer).append($editablePreview.children());

        });
    }

    function addBoxClickEvent() {
        $(document).on('click', '.box-actions', (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        $(document).on('click', '.box', (event) => {
            if (!event.target.closest('#elements-container')) {
                var target = event.target.closest('.box');
                openConfig(target);
            }
            event.preventDefault();

        });
    }

    function setBoxAttr(name, value) {
        const boxId = $('#config-box').attr('data-box-id');
        const box = $(`#box${boxId}`);
        box.attr(name, value);
    }

    function removeBoxAttr(name) {
        const boxId = $('#config-box').attr('data-box-id');
        const box = $(`#box${boxId}`);
        box.removeAttr(name);
    }

    function addSliderConfigEvents() {
        $('#slider-config').on('change', '#secondsPerSlideInput', (event) => {
            setBoxAttr('data-seconds', event.target.value)
            event.preventDefault();
            event.stopPropagation();
        });

        $('#slider-config').on('change', '#randomizeOrderCheckbox', (event) => {
            setBoxAttr('data-randomize-order', $('#randomizeOrderCheckbox').prop('checked'))
            event.preventDefault();
            event.stopPropagation();
        });
    }

    function addResetBackgroundEvent() {
        $(document).on('click', '.bkg-color-reset-btn', () => resetBackground());
    }

    function resetBackground() {
        const boxId = $('#config-box').attr('data-box-id');
        const box = $(`#box${boxId}`);
        box.css('backgroundColor' , '#FFFFFF');
        $('.bkg-color-input').val('#FFFFFF');
    }


    function addConfigBackgroundChange() {
        $(document).on('change', ".bkg-color-input", (event) => {
            const boxId = $('#config-box').attr('data-box-id');
            const box = $(`#box${boxId}`);
            box.css('backgroundColor' , event.target.value);
            event.stopPropagation();
        });
    }

    function addRowEvents() {
        $(document).on('click', '.move-up', (event) => moveRowUp(event));
        $(document).on('click', '.move-down', (event) => moveRowDown(event));
        $(document).on('click', '.row-remove-btn', (event) => removeRow(event));
    }

    function addConfigEvents() {
        $(document).on('click', '.config-remove-btn', (event) => closeConfig());
        addImageTypeSelectorEvent();
        addConfigTextChange();
        addConfigToggleEvent();
        addImageUploadEvent();
        addSliderConfigEvents();
        addConfigBackgroundChange();
        addResetBackgroundEvent();
    }

    function addCKEditor() {
        // Set up ckeditor on the rich text boxes
		$("#text-input").each(function(){
			if (typeof $(this).attr("id") != "undefined"){
				CKEDITOR.replace($(this).attr("id"), {
					extraPlugins: 'colorbutton,colordialog',
					toolbar: [
						//{ name: 'document', groups: [ 'mode', 'document', 'doctools' ], items: [ 'Source' ] },
						{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ], items: [ 'Bold', 'Italic', 'Superscript'] },
						{ name: 'colors', items: [ 'TextColor', 'BGColor' ] }, //'fontsize', 'fontColor', 'fontBackgroundColor', 
						{ name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ], items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent' ] },
						{ name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] }
					]
				});

				//relay the WYSIWYG input to the textarea
				CKEDITOR.instances[$(this).attr("id")].on('blur', function() { 
					var name = $(this).attr("name"), $el = $("[name='" + name + "']");
					var html = CKEDITOR.instances[name].getData();

					$el.val(html);

					//trigger native event
					$el.get(0).dispatchEvent(new Event('change'));
				});
			}
		});
    }

    function ensureCKEditor() {
        // Recreate CKEditor if it doesn't exist
        if (!CKEDITOR.instances["text-input"]) {
            CKEDITOR.replace("text-input", {
                extraPlugins: 'colorbutton,colordialog',
				toolbar: [
                    //{ name: 'document', groups: [ 'mode', 'document', 'doctools' ], items: [ 'Source' ] },
                    { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ], items: [ 'Bold', 'Italic', 'Superscript'] },
					{ name: 'colors', items: [ 'TextColor', 'BGColor' ] }, //'fontsize', 'fontColor', 'fontBackgroundColor', 
					{ name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ], items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent' ] },
                    { name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] }
                ]
            });
            
            CKEDITOR.instances["text-input"].on('blur', function() {
                var name = $(this).attr("name"), $el = $("[name='" + name + "']");
                var html = CKEDITOR.instances[name].getData();
                $el.val(html);
                $el.get(0).dispatchEvent(new Event('change'));
            });
        }
    }

    function applyProperty($el, prop) {
        // 1) Read the global shorthand — e.g., data-margin or data-padding
        const baseValue = $el.attr(`data-${prop}`);
        if (baseValue) {
            $el.css(prop, baseValue); // e.g. margin: 10px;
        }

        // 2) Individual directions
        const directions = ["top", "right", "bottom", "left"];

        directions.forEach(dir => {
            const attrName = `data-${prop}-${dir}`;  // e.g. data-margin-top
            const val = $el.attr(attrName);

            if (val) {
                $el.css(`${prop}-${dir}`, val); // e.g. margin-top: 5px;
            }
        });
    }


    function generateOutputPage(selector = "#page-container") {

        // Clone node so we don't modify the original
        const $clone = $(selector).clone();

        // Remove row-controls entirely
        $clone.find(".row-controls").remove();

        // Unwrap row-wrapper → keep only .row
        $clone.find(".row-wrapper").each(function() {
            const $row = $(this).find(".row").first();
            if ($row.length) {
                applyProperty($row, 'padding');
                applyProperty($row, 'margin');
                $(this).replaceWith($row);
            } else {
                $(this).remove();
            }
        });

        // Remove .box-header and .box-actions from each .box
        $clone.find(".box .box-header").remove();
        $clone.find(".box .box-actions").remove();
        addPropertiesToBox($clone);

        // Return jQuery element (DOM node)
        return $clone;
    }

    function addPropertiesToBox($wrapper) {
        $wrapper.find('.box').each((i, box) => {
            console.log(box);
            applyProperty($(box), 'padding');
            applyProperty($(box), 'margin');
        });
    }


    function generateEditableLivePreview(selector = "#page-container") {
        const testHtml = `<div id="page-container">
            <div class="row" data-margin="10px" data-padding="15%" style="margin:10px;padding:15%"><div class="box col-2"  data-margin="11%" data-padding="15%" style="margin:11%;padding:15%" draggable="true" data-size="2" style="visibility: visible;" data-id="0" id="box0" data-name="0"><div class="box-text"><p><strong>test</strong></p>
</div></div></div>
        <div class="row" data-margin="10%" data-padding="5%" style="margin:10%;padding:5%"><div class="box col-4 slider" draggable="true" data-size="4" style="visibility: visible;" data-id="1" id="box1" data-name="1" data-seconds="1" data-randomize-order="true"><div class="box-text"></div><img src="https://demo-dev2.omnisourcegear.com/OVERRIDES/Omni.demo/storage/home/headwear5.jpg" class="box-image" data-url="llink" data-motion="false" data-alt="alt" data-title="title" data-id="1"><img src="https://demo-dev2.omnisourcegear.com/OVERRIDES/Omni.demo/storage/home/headwear5.jpg" class="box-image" data-url="link2" data-motion="false" data-alt="alt2" data-title="title2" data-id="2"></div></div><div class="row"><div class="box col-4" draggable="true" data-size="4" style="visibility: visible;" data-id="2" id="box2" data-name="2"><div class="box-text"></div><img src="https://demo-dev2.omnisourcegear.com/OVERRIDES/Omni.demo/storage/home/headwear5.jpg" class="box-image" data-url="single" data-motion="true" data-alt="single" data-title="single" data-id="1"></div></div><div class="row"></div></div>`;
        // Clone so original DOM is untouched
        const $clone = $(testHtml).clone();

        // 1. Wrap each .row in a new .row-wrapper and add .row-controls
        $clone.find("> .row").each(function() {
            const $row = $(this);
            $row.removeAttr('style');
            // Create row-controls
            const $controls = $(`
                <div class="row-controls">
                    <button type="button" class="move-up"><i class="fa fa-arrow-up"></i></button>
                    <button type="button" class="move-down"><i class="fa fa-arrow-down"></i></button>
                    <button type="button" class="row-remove-btn"><i class="fa fa-times"></i></button>
                </div>
            `);

            // Create wrapper
            const $wrapper = $(`<div class="row-wrapper"></div>`);

            // Wrap
            $row.wrap($wrapper);
            const $realWrapper = $row.parent();

            addSpacingControlToRow($realWrapper, $row);
            // Insert controls before the row
            $row.before($controls);
        });

        // 2. Add box-header and box-actions to each .box
        $clone.find(".box").each(function() {
            const $box = $(this);
            $box.removeAttr('style');

            const boxId = $box.attr("data-id") || "";
            const boxSize = $box.attr("data-size") || "";

            // Build header text exactly like original
            const headerText = `Box 1x${boxSize} ID: ${boxId}`;

            // Insert header ONLY if missing
            if ($box.find(".box-header").length === 0) {
                $box.prepend(`<div class="box-header">${headerText}</div>`);
            }

            // Insert actions ONLY if missing
            if ($box.find(".box-actions").length === 0) {
                $box.prepend(`
                    <div class="box-actions">
                        < type="button" class="remove-btn"><i class="fa fa-times"></i></>
                    </div>
                `);
            }

            addRemoveButtonClickEvent($box.find(".remove-btn"));
        });

        return $clone;
    }

    function resetImageSelect() {
        const $selector = $("#image-selector");
        $selector.val(0);
        $selector.trigger("change");
    }

    function closeResetSliderConfig() {
        $('#slider-config-wrapper').hide();
        $('#secondsPerSlideInput').val("");
        $('#randomizeOrderCheckbox').prop("checked", false);
    }

    function addImageTypeSelectorEvent() {
        $('#config-image').on('change', '#image-selector', (event)=> {
            const boxId = $('#config-box').attr('data-box-id');
            const box = $(`#box${boxId}`);
            event.preventDefault();
            event.stopPropagation();
            resetBox();
            resetConfigBox();
            closeResetSliderConfig
            if (event.target.value > 0) {
                $('#image-upload-wrapper').show();
                if (Number(event.target.value) === 1) {
                    //single image
                  //  closeResetSliderConfig();
                    singleImage = true;
                    box.removeClass('slider');
                    $('#config-bkg-img').show();
                } else {
                    //slider
                    singleImage = false;
                    $('#slider-config-wrapper').show();
                    $('#config-bkg-img').hide();
                    box.addClass('slider')
                }
            } else {
                $('#image-upload-wrapper').hide();
            }
        });
    }

    function addSpacingControlToRow($rowWrapper, $row) {
        const spacingLibInstance = spacingLib();
        spacingLibInstance.initSpacingControl($rowWrapper);
        spacingLibInstance.applyTo($row);
        spacingLibInstance.loadFromElement($rowWrapper, $row);
        spacingInstances.set($row[0], spacingLibInstance); // Track instance
    }

    function addspacingToExistingRow() {
        const $rowWrapper = $('.row-wrapper');
        const $row = $rowWrapper.find('.row');
        addSpacingControlToRow($rowWrapper, $row);
    }

	function setStartingIDCounter(){
		//for new pages, the counter is set to zero, if an edit, we need to get the max already used
		var idCounterExisting = 0;

		$("#page-container").find("div[data-name]").each(function(){
			var name = $(this).data("name").toString(), v;
			v = parseInt(name.replace(/[^0-9]/g, ""));
			if (isNaN(v)) v = 0;
			if (v > idCounterExisting) idCounterExisting = v;
		});

		idCounter = idCounterExisting + 1;
	}


    $(document).ready(() => {
        elementsContainer = document.getElementById("elements-container");
        pageContainer = document.getElementById("page-container");
        previewElement = document.createElement("div");
        previewElement.classList.add("preview");

		setStartingIDCounter();

        addspacingToExistingRow();
        addNewRowEvent();
        addBoxClickEvent();
        addBoxEvent();
        addDragEvents();
        addRowEvents();
        addConfigEvents();

        addCKEditor();

        addSaveEvent();
        addLoadEvent()
    });
})();
