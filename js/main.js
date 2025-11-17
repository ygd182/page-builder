(() => {
    let elementsContainer = null;
    let pageContainer = null;
    let draggedElement = null;
    let isCloned = false;
    let previewElement = null;
    let idCounter = 0;
    let selectedBox = null;
    let boxes = []; // {imgFile: '', fontColor: '', bkgColor: '', text: ''}
    let rows = []; //array of boxes ids

    function resetSelect() {
        const $selector = $("#box-selector");
        $selector.val(0);
        $selector.trigger("change");
    }

    function updateInputImgState(boxId) {
        const box = $(`.box[data-id='${boxId}']`)[0];
        const size = parseInt($(box).attr('data-size')) === 4 ? 7 : 1;
        if (boxes[boxId].imgFile?.length >= size) {
            $("#image-upload").prop('disabled', true);
        } else {
            $("#image-upload").prop('disabled', false);
        }

        if (boxes[boxId].imgFile?.length > 1) { 
            $('#slider-config').show();
            $(box).addClass('slider');
        } else {
            $(box).removeClass('slider');
            $('#slider-config').hide();
        }       

       /* if (boxes[boxId].imgFile?.length > 1) {
            $('#config-bkg').hide();
            $(box).addClass('slider');
            box.style.backgroundColor = '';
        } else {
            $('#config-bkg').show();
            $(box).removeClass('slider');
        } */
    }

    function addBoxData(boxElement, boxData) {
        const header = boxElement.getElementsByClassName('box-header');
        header[0].textContent = `Box 1x${boxData.size} ID: ${idCounter}`;
        boxElement.setAttribute('data-name', idCounter);
        boxElement.draggable = true;
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "box-actions";
        boxElement.appendChild(actionsDiv);
        addRemoveButton(actionsDiv);
        addTextContent(boxElement, boxData.text);
        boxElement.dataset.id = idCounter;

        if (boxData.fontColor || boxData.bkgColor) {
            boxElement.style.color = boxData.fontColor || '';
            boxElement.style.backgroundColor = boxData.bkgColor || '';
        }

        if (boxData.imgFile.length > 0) {
            boxElement.style.backgroundImage = `url(${boxData.imgFile[boxData.imgFile.length - 1].url})`;
            boxElement.style.backgroundSize = "contain";
            boxElement.style.backgroundPosition = "center";
            boxElement.style.backgroundRepeat = "no-repeat";
            if (boxData.imgFile?.length > 1) {
              //  $('#config-bkg').hide();
                $(boxElement).addClass('slider');
                boxElement.style.backgroundColor = '';
            }
        }

        return boxElement;
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
        document.addEventListener('change', ()=> {
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

    function getAvailableRow(size) {
        let rows = Array.from(pageContainer.children).filter(row => row.classList.contains("row"));
        for (let row of rows) {
            let usedSpace = Array.from(row.children).reduce((sum, el) => sum + parseInt(el.dataset.size || 0), 0);
            if (usedSpace + parseInt(size) <= 4) {
                return row;
            }
        }
        return null;
    }

    function sizeFitInRow(row, size) {
        let usedSpace = Array.from(row.children).reduce((sum, el) => sum + parseInt(el.dataset.size || 0), 0);
        return (usedSpace + parseInt(size) <= 4) 
    }
    
    function addRemoveButton(actions) {
        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "<i class='fas fa-times'></i>";
        removeBtn.classList.add("remove-btn");
        removeBtn.addEventListener("click", () => {
            closeConfig();
            let box = actions.parentNode;
            let parentRow = box.parentNode;

            box.remove();
            if (parentRow.children.length === 0) {
                parentRow.remove();
            }

            ensureEmptyRow();
        });
        actions.appendChild(removeBtn);
    }

    function addNewRow() {
        closeConfig();
        let newRow = '<div class="row-wrapper"><div class="row-controls"><button class="move-up"><i class="fas fa-arrow-up"></i></button><button class="move-down"><i class="fas fa-arrow-down"></i></button><button class="row-remove-btn"><i class="fas fa-times"></i></button></div><div class="row"></div></div>';
    
        $('#page-container').append(newRow);
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

    function openConfig(box) {
        closeConfig();
        
        const id = box.dataset.id;
        
        let configBox = document.getElementById("config-box");
        configBox.setAttribute('data-box-id', id);
        let name = document.getElementById('box-name');
        name.innerHTML = 'Box ' + box.getAttribute('data-name');
        const imgFile = boxes[id]?.imgFile;
        const size = box.dataset.size;
        
        let imgUrl = imgFile?.length > 0 ? imgFile[0].file : null;
        selectedBox = box;
        if (boxes[id]?.imgFile.length > 0) {
            loadPreviewImages(id);
            $('#toggleButton').removeClass('active');           
            $('#config-image').show();
            $('#config-text').hide();
        } else {
            loadTextAndBkg();
            $('#toggleButton').addClass('active');
            $('#config-text').show();
            $('#config-image').hide();
        }
        
        
        if (imgUrl && !$.isEmptyObject(imgUrl)) {
            const fileReader = document.getElementById("image-upload");
            const dataTransfer = new DataTransfer();
            // Add your file to the file list of the object
            dataTransfer.items.add(imgUrl);
            // Save the file list to a new variable
            const fileList = dataTransfer.files;
            // Set your input `files` to the file list
            fileReader.files = fileList;
        } else {
            const fileReader = document.getElementById("image-upload");
            fileReader.value = null;
        }
    

        configBox.className = '';
        
        updateInputImgState(id);
    }

    function loadPreviewImages(boxId) {
        boxes[boxId]?.imgFile.forEach((imgFile, index) => {
            addPreviewImage(imgFile, boxId, index);
        }); 
    }

    function addRemovePreviewButton(img, boxId, imgId) {
        const removeBtn = document.createElement("a");
        removeBtn.textContent = "Remove Image";
        removeBtn.classList.add("remove-img-link");
        removeBtn.href = '';
        removeBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            img.parent().remove();
            const imgs =  boxes[boxId].imgFile;
            boxes[boxId].imgFile = imgs.splice(0, imgId);
            updateInputImgState(boxId);
            const fileReader = document.getElementById("image-upload");
            fileReader.value = null;
            const box = $(`.box[data-id='${boxId}']`)[0];
            console.log(imgId);
            if (imgId === 0) {
                $(box).find("img.box-image").remove();
            } else {
                //box.style.backgroundImage = `url(${boxes[boxId].imgFile[imgId-1].url})`;
                $(box).find("img.box-image").eq(imgId).remove();
            }
        });
        img.append(removeBtn);
    }

    /*function addImageLink(wrapper, boxId, imgId) {
        const input = $("<input type='url' class='input-link'>");
        input[0].value = boxes[boxId]?.imgFile[imgId]?.link || '';
        input.on('change', (event)=> {
            boxes[boxId].imgFile[imgId].link = event.target.value;
            event.preventDefault();
            event.stopPropagation();
        })
        wrapper.append(input);
    } */

    function addImageLink(wrapper, boxId, imgId) {
			const input = $("<input type='url' class='input-link'>");
			input[0].value = boxes[boxId]?.imgFile[imgId]?.link || '';
			input.on('change', (event)=> {
				boxes[boxId].imgFile[imgId].link = $.trim(event.target.value);
				
				//var $box = $("#" + boxes[boxId].id);
				var $box = $(`#box${boxId}`);
				$box.find("img[data-id=" + (imgId + 1) + "]").attr("data-url", boxes[boxId].imgFile[imgId].link);
				
				
                event.preventDefault();
				event.stopPropagation();
			});
            var $divLink = $("<div />").addClass("image-content-row")
				.append("<span>Link:</span>")
                .append(input);

			var $div = $("<div />");
			$div.append($divLink);

			//add toggle switch
			var $div2 = $("<div />").addClass("toggle-container")
				.append("<span>Motion Off</span>")
				.append("<div class=\"toggle toggle-motion\"></div>")
				.append("<span>On</span>");

			if ("motion" in boxes[boxId].imgFile[imgId] && boxes[boxId].imgFile[imgId].motion == true){
				$div2.find("div.toggle-motion").addClass("active");
			}
			
			addConfigMotionToggleEvent($div2, boxId, imgId);
            $div.append(getImageTitle(boxId, imgId));
            $div.append(getImageAlt(boxId, imgId));

            

			$div.append($div2)

            addRemovePreviewButton($div, boxId, imgId);
            $div.addClass('image-center-content');
			wrapper.append($div); //input
		}

        function getImageTitle(boxId, imgId) {
            const input = $("<input type='text' class='input-link'>");
			input[0].value = boxes[boxId]?.imgFile[imgId]?.title || '';
			input.on('change', (event)=> {
                boxes[boxId].imgFile[imgId].title = $.trim(event.target.value);
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
			input[0].value = boxes[boxId]?.imgFile[imgId]?.alt || '';
			input.on('change', (event)=> {
                boxes[boxId].imgFile[imgId].alt = $.trim(event.target.value);
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

				if ($toggle.hasClass("active")){
					$toggle.removeClass("active");

					boxes[boxId].imgFile[imgId].motion = false;
				}
				else {
					$toggle.addClass("active");
					boxes[boxId].imgFile[imgId].motion = true;
				}

				var $box = $(`#box${boxId}`);
				$box.find("img[data-id=" + (imgId + 1) + "]").attr("data-motion", boxes[boxId].imgFile[imgId].motion);
				
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
    }

    function addTextContent(box, text) {
        const div = document.createElement('div');
        div.className = 'box-text';
        if (text) {
            div.textContent = text;
        }
        box.appendChild(div);
    }

    function moveRowUp(row) {
        closeConfig();
        let prevRow = row.previousElementSibling;
        if (prevRow) {
            row.parentNode.insertBefore(row, prevRow);
        }
    }

    function moveRowDown(row) {
        closeConfig();
        let nextRow = row.nextElementSibling;
        if (nextRow) {
            row.parentNode.insertBefore(nextRow, row);
        }
    }

    function closeConfig() {
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
       // $('#bkg-color-input')[0].value = null;
        $('#text-input')[0].value = null;
        //$('#color-input')[0].value = null;
        $('#config-image').show();
        $('#config-text').hide();
        $('#toggleButton').removeClass('active');
    }

    /*function loadTextAndBkg() {
        $('#text-input')[0].value = boxes[selectedBox.dataset.id].text;
        $('#color-input')[0].value = boxes[selectedBox.dataset.id].fontColor;
       // $('#bkg-color-input')[0].value = boxes[selectedBox.dataset.id].bkgColor;
    }*/


    function loadTextAndBkg() {
        var html = boxes[selectedBox.dataset.id]?.html, $english = "", $el = $("<div />");

        $el.html(html);
        $english = $el.find("div.english");

        if ($english.length){
            $english.remove(".hide");
            $('#text-input')[0].value = $english.html();
            CKEDITOR.instances["text-input"].setData($english.html());
        }
        else {
            $('#text-input')[0].value = "";
            CKEDITOR.instances["text-input"].setData("");
        }
    }

    function resetBox() {
        const boxId = $('#config-box').attr('data-box-id');
        const box = $(`#box${boxId}`);
        box.find("img.box-image").remove();
        box.children('.box-text')[0].textContent = '';
        box[0].style.color = '';
        box[0].style.backgroundColor = '';
        $('#text-input')[0].value = '';
    }

    function resetConfigBox() {
        const fileReader = document.getElementById("image-upload");
        fileReader.value = null;
       // $('#bkg-color-input')[0].value = null;
       // $('#text-input')[0].value = null;
       // $('#color-input')[0].value = null;
       	$('#text-input')[0].value = null;
			CKEDITOR.instances["text-input"].setData("");
        $('.img-preview-list').html('');
        if (selectedBox) {
            boxes[selectedBox.dataset.id] = { imgFile: []};
            updateInputImgState(selectedBox.dataset.id);
        }
    }

    function resetBackground() {
        selectedBox.style.backgroundColor = '#00000000';
        boxes[selectedBox.dataset.id] = boxes[selectedBox.dataset.id] || {};
        boxes[selectedBox.dataset.id].bkgColor = null;
    }

    /*function addImageUploadEvent() {
        document.getElementById("image-upload").addEventListener("change", (event) => {
            if (selectedBox && event.target.files.length > 0) {
            let file = event.target.files[0];
            let reader = new FileReader();
            reader.onload = function(e) {
                selectedBox.style.backgroundImage = `url(${e.target.result})`;
                selectedBox.style.backgroundSize = "contain";
                selectedBox.style.backgroundPosition = "center";
                selectedBox.style.backgroundRepeat = "no-repeat";
                boxes[selectedBox.dataset.id].imgFile.push({file, url: e.target.result});
                addPreviewImage({file, url: e.target.result},selectedBox.dataset.id, boxes[selectedBox.dataset.id].imgFile.length - 1);
                updateInputImgState(selectedBox.dataset.id);
            };
            reader.readAsDataURL(file);
        }
        event.preventDefault();
        event.stopPropagation();
        });
    }*/

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
                            boxes[selectedBox.dataset.id].imgFile.push({file, url: response.url});
                            $img = $("<img />").attr("src", response.url)
                                .addClass("english")
                                .attr("data-url", "")
                                .attr("data-motion", false)
                                .attr("data-id", boxes[selectedBox.dataset.id].imgFile.length);

                            var $box = $("#" + selectedBox.id);
                            $box.find("img.box-image").remove();
                            $box.append($img);
                            addPreviewImage({file, url: response.url},selectedBox.dataset.id, boxes[selectedBox.dataset.id].imgFile.length - 1);
                            updateInputImgState(selectedBox.dataset.id);
                        }
                        else {
                            alert(response.message);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.log("fail");
                        console.log(arguments);
                        //$("#status").html("Upload failed: " + error);
                        //TODO to remove these lines when integrating back to the admin
                        var response = { url: 'https://demo-dev2.omnisourcegear.com/OVERRIDES/Omni.demo/storage/home/headwear5.jpg'}
                        boxes[selectedBox.dataset.id].imgFile.push({file, url: response.url});
                        $img = $("<img />").attr("src", response.url)
                                .addClass("box-image")
                                .attr("data-url", "")
                                .attr("data-motion", false)
                                .attr("data-id", boxes[selectedBox.dataset.id].imgFile.length);

                            var $box = $("#" + selectedBox.id);
                  //          $box.find("img.box-image").remove();
                            $box.append($img);
                        addPreviewImage({file, url: response.url},selectedBox.dataset.id, boxes[selectedBox.dataset.id].imgFile.length - 1);
                        updateInputImgState(selectedBox.dataset.id);
                    }
                });
            }
            event.preventDefault();
            event.stopPropagation();
        });
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
            boxes.push({
                imgFile: [],
                fontColor: '',
                bkgColor: '',
                text: '',
                size: draggedElement.dataset.size,
            });
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
        event.target.parentNode.parentNode.remove();
    }

    function addConfigTextChange() {
        document.getElementById("text-input").addEventListener("change", (event) => {
            const boxId = $('#config-box').attr('data-box-id');
            const box = $(`#box${boxId}`);
            box.children('.box-text')[0].innerHTML = event.target.value;
            
            boxes[selectedBox.dataset.id] = boxes[selectedBox.dataset.id] || {};
            boxes[selectedBox.dataset.id].html = box.html(); //event.target.value;
            
            event.stopPropagation();
        });

    }

    /*function addConfigTextChange() {
        document.getElementById("text-input").addEventListener("change", (event) => {
            const boxId = $('#config-box').attr('data-box-id');
            const box = $(`#box${boxId}`);
            box.children('.box-text')[0].textContent = event.target.value;
            boxes[selectedBox.dataset.id] = boxes[selectedBox.dataset.id] || {};
            boxes[selectedBox.dataset.id].text = event.target.value;
            event.stopPropagation();
        });
    }*/

    function addConfigTextColorChange() {
        document.getElementById("color-input").addEventListener("change", (event) => {
            selectedBox.style.color = event.target.value;
            boxes[selectedBox.dataset.id] = boxes[selectedBox.dataset.id] || {};
            boxes[selectedBox.dataset.id].fontColor = event.target.value;
            event.stopPropagation();
        });
    }

    function addConfigBackgroundChange() {
        document.getElementById("bkg-color-input").addEventListener("change", (event) => {
            selectedBox.style.backgroundColor = event.target.value;
            boxes[selectedBox.dataset.id] = boxes[selectedBox.dataset.id] || {};
            boxes[selectedBox.dataset.id].bkgColor = event.target.value;
            event.stopPropagation();
        });
    }

    function addConfigToggleEvent() {
        document.getElementById("toggleButton").addEventListener("click", function(event) {
            this.classList.toggle("active");
            if (this.classList.contains('active')) {
                $('#config-text').show();
                $('#config-image').hide();
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
            ($('#page-container').children()).each((rowIndex, rowWrapper) => {
                const row = $(rowWrapper).find('.box');
                const rowData =  [];
                row.each((boxIndex, box) => {
                    console.log('box', box);
                    rowData.push(boxes[box.dataset.id]);
                });
                rows.push(rowData);
            });
            console.log(rows);
        });
    }

    function addLoadEvent() {
        
        $(document).on('click', '#load-btn', (event) => {
            pageContainer.innerHTML = '';
            idCounter = 0;
            selectedBox = null;
            boxes = []; // {imgFile: '', fontColor: '', bkgColor: '', text: ''}
            rows = [];
            event.preventDefault();
            event.stopPropagation();
            data.forEach((row) => {

                let newRow = $(`
                    <div class="row-wrapper">
                        <div class="row-controls">
                            <button class="move-up"><i class="fas fa-arrow-up"></i></button>
                            <button class="move-down"><i class="fas fa-arrow-down"></i></button>
                            <button class="row-remove-btn"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="row"></div>
                    </div>
                `);

                let rowContainer = newRow.find(".row");
                row.forEach(boxData => {
                    let box = createBox(boxData);
                    rowContainer.append(box);
                    
                    box = addBoxData(box, boxData);
                    boxes.push(boxData);
                    idCounter++;
                });

                $('#page-container').append(newRow);

            });

        });
    }

    function addResetBackgroundEvent() {
        $(document).on('click', '#bkg-color-reset-btn', () => resetBackground());
    }

    function addBoxClickEvent() {
        $(document).on('click', '.box', (event) => {
            if (event.target.parentNode.className === 'row') {
                openConfig(event.target);
            }
            event.preventDefault();
        });
    }

    function addSliderConfigEvents() {
        $('#slider-config').on('change', '#secondsPerSlideInput', (event) => {
            console.log('seconds');
            event.preventDefault();
            event.stopPropagation();
        });

        $('#slider-config').on('change', '#randomizeOrderCheckbox', (event) => {
            console.log('random');
            event.preventDefault();
            event.stopPropagation();
        });
    }

    function addRowEvents() {
        $(document).on('click', '.move-up', (event) => moveRowUp(event.target.closest(".row-wrapper")));
        $(document).on('click', '.move-down', (event) => moveRowDown(event.target.closest(".row-wrapper")));
        $(document).on('click', '.row-remove-btn', (event) => removeRow(event));
    }

    function addConfigEvents() {
        $(document).on('click', '.config-remove-btn', (event) => closeConfig());
        addConfigTextChange();
        //addConfigTextColorChange();
        //addConfigBackgroundChange();
        addConfigToggleEvent();
        addResetBackgroundEvent();
        addImageUploadEvent();
        addSliderConfigEvents();
    }

    function addCKEditor() {
        // Set up ckeditor on the rich text boxes
		$(".rich_text_page_builder").each(function(){
			if (typeof $(this).attr("id") != "undefined"){
				CKEDITOR.replace($(this).attr("id"), {
					toolbar: [
						{ name: 'document', groups: [ 'mode', 'document', 'doctools' ], items: [ 'Source' ] },
						{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ], items: [ 'Bold', 'Italic', 'Superscript'] },
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

    function generateOutputPage(selector = "#page-container") {

        // Clone node so we don't modify the original
        const $clone = $(selector).clone();

        // Remove row-controls entirely
        $clone.find(".row-controls").remove();

        // Unwrap row-wrapper → keep only .row
        $clone.find(".row-wrapper").each(function() {
            const $row = $(this).find(".row").first();
            if ($row.length) {
                $(this).replaceWith($row);
            } else {
                $(this).remove();
            }
        });

        // Remove .box-header and .box-actions from each .box
        $clone.find(".box .box-header").remove();
        $clone.find(".box .box-actions").remove();

        // Return jQuery element (DOM node)
        return $clone;
    }


    function generateEditableLivePreview(selector = "#page-container") {

        // Clone so original DOM is untouched
        const $clone = $(selector).clone();

        // 1. Wrap each .row in a new .row-wrapper and add .row-controls
        $clone.find("> .row").each(function() {
            const $row = $(this);

            // Create row-controls
            const $controls = $(`
                <div class="row-controls">
                    <button class="move-up"><i class="fas fa-arrow-up"></i></button>
                    <button class="move-down"><i class="fas fa-arrow-down"></i></button>
                    <button class="row-remove-btn"><i class="fas fa-times"></i></button>
                </div>
            `);

            // Create wrapper
            const $wrapper = $(`<div class="row-wrapper"></div>`);

            // Wrap
            $row.wrap($wrapper);

            // Insert controls before the row
            $row.before($controls);
        });

        // 2. Add box-header and box-actions to each .box
        $clone.find(".box").each(function() {
            const $box = $(this);

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
                        <button class="remove-btn"><i class="fas fa-times"></i></button>
                    </div>
                `);
            }
        });

    return $clone;
}


    $(document).ready(() => {
        elementsContainer = document.getElementById("elements-container");
        pageContainer = document.getElementById("page-container");
        previewElement = document.createElement("div");
        previewElement.classList.add("preview");

        addNewRowEvent();
        addBoxClickEvent();
        addBoxEvent();
        addDragEvents();
        addRowEvents();
        addConfigEvents();

        addCKEditor();

        addSaveEvent();
        addLoadEvent();
    });
})();
