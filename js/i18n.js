// i18n.js — lightweight runtime translations (English + Japanese)

const I18N_STORAGE_KEY = "gym-planner-language";

const I18N = {
  en: {
    "app.title": "Room Planner",
    "app.subtitle": "Drag gymnastics equipment from the left panel into the room. Click an object to move, rotate, or delete it.",
    "lang.label": "Language",
    "lang.english": "English",
    "lang.japanese": "Japanese",

    "tab.equipment": "Equipment",
    "tab.actions": "Actions",
    "tab.map": "Map",

    "btn.addEquipment": "Add Equipment Item",
    "btn.deleteSelected": "Delete Selected",
    "btn.undo": "Undo (Ctrl+Z)",
    "btn.savePlanner": "Save Planner",
    "btn.clearRoom": "Clear Room",
    "btn.resetBackground": "Reset Background View",
    "btn.showGrid": "Show Grid",
    "btn.hideGrid": "Hide Grid",
    "btn.mouseModeDrag": "Mouse Mode: Drag",
    "btn.mouseModeSelect": "Mouse Mode: Select",
    "btn.addNote": "Add Note",
    "btn.suggestPlanner": "Suggest Planner",
    "btn.measureDistance": "Measure Distance",
    "btn.measureArea": "Measure Area",
    "btn.alignLeft": "Align Left",
    "btn.alignCenter": "Align Center",
    "btn.rotateCW": "Rotate 90° CW",
    "btn.rotateCCW": "Rotate 90° CCW",
    "btn.copy": "Copy",
    "btn.paste": "Paste",
    "btn.newMap": "New Map",
    "btn.importGoogleMap": "Import Google Map",
    "btn.newPlanner": "New Planner",
    "btn.deletePlanner": "Delete Planner",
    "btn.drawYellowLine": "Draw Yellow Line",
    "btn.drawYellowFreehand": "Draw Freehand",
    "btn.removeYellowArea": "Remove Yellow Area",
    "btn.deleteCustomMap": "Delete Custom Map",
    "btn.deleteCustomEquipment": "Delete Custom Equipment",
    "btn.cancel": "Cancel",
    "btn.createMap": "Create Map",
    "btn.addItem": "Add Item",
    "btn.importFile": "Import File",
    "btn.resetCrop": "Reset Crop",

    "label.background": "Background",
    "label.backgroundZoom": "Background Zoom",
    "label.mapName": "Map Name",
    "label.widthCm": "Width (cm)",
    "label.heightCm": "Height (cm)",
    "label.color": "Color",
    "label.texture": "Texture",
    "label.name": "Name",
    "label.item": "Item",
    "label.lengthCm": "Length (cm)",
    "label.note": "Note",
    "label.countBars": "Bars Count",
    "label.countBeam": "Beam Count",
    "label.countBoxVault": "Box Vault Count",
    "label.countFloor": "Floor Count",
    "label.countVault": "Vault Count",
    "label.googleMapsLink": "Google Maps Link",
    "label.planner": "Planner",
    "title.newMap": "Create New Map",
    "title.newEquipment": "Add Equipment Item",
    "title.newNote": "Add Note",
    "title.suggestPlanner": "Suggest Planner",
    "title.importGoogleMap": "Import Google Map Satellite Image",
    "placeholder.newMapName": "My Training Room",
    "placeholder.newEquipmentName": "Custom Beam",
    "placeholder.googleMapsLink": "https://maps.google.com/...",
    "placeholder.googleMapName": "Imported Satellite Map",
    "placeholder.noteText": "Enter note text...",

    "option.gymFloor": "Gym Floor (2 Courts)",
    "option.indoorGym": "Indoor Gym",
    "option.concrete": "Concrete",
    "option.woodDeck": "Wood Deck",
    "option.stoneBrick": "Stone / Brick",
    "option.grass": "Grass",
    "option.dirtGravel": "Dirt / Gravel",
    "option.asphalt": "Asphalt",
    "option.defaultPlanner": "Default Planner",
    "equipment.bars": "Bars",
    "equipment.beam": "Beam",
    "equipment.boxVault": "Box Vault",
    "equipment.floor": "Floor",
    "equipment.springboard": "Springboard",
    "equipment.vault": "Vault",
    "equipment.mat": "Mat",

    "hint.default": "Drop objects inside the room",
    "hint.dragging": "Dragging {item}. Drop it in the room.",
    "hint.backgroundViewReset": "Background view reset.",
    "hint.equipmentDialogUnavailable": "Equipment dialog is unavailable.",
    "hint.addedEquipment": "Added equipment: {name}. Drag it from Equipment.",
    "hint.unableAddEquipment": "Unable to add equipment item.",
    "hint.customEquipmentUpdated": "Custom equipment updated.",
    "hint.unableUpdateCustomEquipment": "Unable to update custom equipment.",
    "hint.selectCustomEquipmentDelete": "Select a custom equipment item to delete.",
    "hint.customEquipmentDeleteCanceled": "Custom equipment delete canceled.",
    "hint.customEquipmentDeleted": "Custom equipment deleted.",
    "hint.customEquipmentInUseCannotDelete": "Cannot delete custom equipment because it is used in {count} map(s). Remove it from those maps first.",
    "hint.unableDeleteCustomEquipment": "Unable to delete custom equipment.",
    "hint.undoObjectRestored": "Undo: object restored.",
    "hint.objectRemoved": "Object removed.",
    "hint.selectObjectDelete": "Select an object to delete.",
    "hint.undoRoomRestored": "Undo: room restored.",
    "hint.roomCleared": "Room cleared.",
    "hint.backgroundUpdated": "Background updated.",
    "hint.newPlannerCreated": "Created planner: {planner}.",
    "hint.newPlannerBlankLoaded": "Loaded planner: {planner} (blank).",
    "hint.plannerDeleteCanceled": "Planner deletion canceled.",
    "hint.plannerDeleted": "Deleted planner: {planner}.",
    "hint.unableDeletePlanner": "Unable to delete planner.",
    "hint.dragModeEnabled": "Drag mode enabled.",
    "hint.selectModeEnabled": "Select mode enabled. Drag to capture multiple objects.",
    "hint.selectionCaptured": "Selected {count} object(s).",
    "hint.noteAdded": "Note added.",
    "hint.noteUpdated": "Note updated.",
    "hint.noteCanceled": "Adding note canceled.",
    "hint.noteEmpty": "Note text cannot be empty.",
    "hint.noteDialogUnavailable": "Note dialog is unavailable.",
    "hint.suggestPlannerDialogUnavailable": "Suggest Planner dialog is unavailable.",
    "hint.suggestPlannerNoItems": "Enter at least one equipment count.",
    "hint.suggestPlannerApplied": "Suggested planner applied with {placed} set(s).",
    "hint.suggestPlannerAppliedPartial": "Suggested planner applied with {placed} set(s). {skipped} set(s) did not fit.",
    "hint.measureToolDisabled": "Measurement tool disabled.",
    "hint.measureFirstPoint": "Measurement tool active. Click the first point.",
    "hint.measureSecondPoint": "Click the second point to finish measuring.",
    "hint.measureTooShort": "Measurement canceled because points are too close.",
    "hint.measureAdded": "Measurement added: {meters} m.",
    "hint.measureAreaToolDisabled": "Area measurement tool disabled.",
    "hint.measureAreaPoint": "Click corner {n} of 4.",
    "hint.measureAreaAdded": "Area measurement added: {sqm} m².",
    "hint.selectAtLeastTwoAlign": "Select at least two objects to align.",
    "hint.alignedLeft": "Aligned selected objects to the left edge.",
    "hint.rotatedCW": "Rotated selection 90° clockwise around group centre.",
    "hint.rotatedCCW": "Rotated selection 90° counter-clockwise around group centre.",
    "hint.selectAtLeastOneRotate": "Select at least one object to rotate.",
    "hint.alignedCenter": "Aligned selected objects to the horizontal center.",
    "hint.undoAnnotationRemoved": "Undo: annotation removed.",
    "hint.nothingToCopy": "Select at least one object to copy.",
    "hint.nothingToPaste": "Nothing to paste. Copy equipment first.",
    "hint.copiedSelection": "Copied {count} selected object(s).",
    "hint.pastedSelection": "Pasted {count} object(s).",
    "hint.undoPastedRemoved": "Undo: pasted objects removed.",

    "hint.plannerSavedDisk": "Planner saved to disk.",
    "hint.unableSaveDisk": "Unable to save planner to disk.",
    "hint.plannerRestoredServer": "Planner restored from server save.",
    "hint.plannerRestoredLocal": "Planner restored from local save.",
    "hint.plannerFileSaved": "Planner file saved.",
    "hint.plannerFileLoaded": "Planner file loaded.",

    "confirm.deleteCustomEquipment": "Delete {name}? This cannot be undone.",
    "confirm.deleteCustomMap": "Delete {name}? This cannot be undone.",
    "confirm.deletePlanner": "Delete planner {planner}? This cannot be undone.",

    "hint.satelliteDisplayFailed": "Satellite image failed to display. Check that 'Maps Static API' is enabled for this API key in Google Cloud Console.",
    "hint.selectImportedMapForDraw": "Select an imported custom map to draw yellow areas.",
    "hint.selectCustomMapForDraw": "Select a custom map to draw yellow areas.",
    "hint.drawLineModeEnabled": "Line draw mode enabled. Drag on the map to place a yellow line.",
    "hint.drawFreehandModeEnabled": "Freehand draw mode enabled. Drag on the map to draw a yellow line.",
    "hint.drawModeDisabled": "Draw mode disabled.",
    "hint.yellowAreasRemoved": "Yellow areas removed from this map.",
    "hint.noCustomMapDelete": "No custom map to delete.",
    "hint.customMapDeleted": "Custom map deleted.",
    "hint.selectCustomMapEdit": "Select a custom map to edit its properties.",
    "hint.customMapNameEmpty": "Custom map name cannot be empty.",
    "hint.customMapSizePositive": "Custom map size must be greater than 0 cm.",
    "hint.importedDimsLocked": "Width and height are locked for imported maps.",
    "hint.invalidCustomMapTexture": "Invalid custom map texture.",
    "hint.customMapUpdated": "Custom map updated.",
    "hint.newMapDialogUnavailable": "New map dialog is unavailable.",
    "hint.enterMapName": "Please enter a map name.",
    "hint.mapSizePositive": "Map size must be greater than 0 cm.",
    "hint.invalidTextureChoice": "Invalid texture choice.",
    "hint.customMapCreated": "Custom map created: {name} ({width}x{height} cm, {texture}).",
    "hint.googleImportDialogUnavailable": "Google map import dialog is unavailable.",
    "hint.mapDimensionsTryZoom": "Map dimensions must be greater than 0 cm. Try a different zoom level.",
    "hint.importedSatelliteMap": "Imported satellite map: {name} ({width}x{height} cm).",
    "hint.pasteGoogleLinkFirst": "Please paste a Google Maps link first.",
    "hint.provideMapName": "Please provide a map name.",
    "hint.selectedImageFile": "Selected image file: {name}",
    "hint.pasteGoogleLink": "Please paste a Google Maps link.",
    "hint.customMapDeleteCanceled": "Custom map delete canceled.",
    "hint.invalidGoogleMapsLink": "Invalid Google Maps link.",
    "hint.importFileBeforeCreate": "Please click Import File and choose an image before creating the map.",
    "hint.drawModeEnabledImage": "Draw mode enabled: drag freehand on the image to draw a yellow line.",
    "hint.cropDragImage": "Drag on the image to crop. Map dimensions update automatically.",
    "hint.unableLoadGooglePreview": "Unable to load Google Maps preview.",

    "error.unsupportedMapTexture": "Unsupported map texture.",
    "error.mapDimensionsPositive": "Map dimensions must be greater than 0 cm.",
    "error.customImageInvalid": "Custom image map data is invalid.",
    "error.googleMapsLinkRequired": "Google Maps link is required.",
    "error.unableDetectLatZoom": "Unable to detect latitude/zoom from link. Use a Google Maps URL (e.g., paste the link from your browser address bar).",
    "error.googleMapPreviewUnavailable": "Google map preview container is unavailable.",

    "dialog.pasteValidGoogleUrl": "Paste a valid Google Maps URL to load the preview.",
    "dialog.previewReady": "Preview ready. Drag or zoom the map to update the link automatically.",
    "dialog.useSnippingToolOnPreview": "Preview ready. Use a snipping tool to capture the map image shown above, then click Import File.",
    "dialog.noFileSelected": "No file selected.",
    "dialog.selectedFile": "Selected: {name}",
    "dialog.loadingImageFile": "Loading image file...",
    "dialog.imageFileLoaded": "Image file loaded. Click Create Map to import.",
    "dialog.importedSatelliteMapShort": "Imported satellite map: {name}.",
    "dialog.detectedImportSize": "Detected: Latitude {latitude}, Longitude {longitude}, Zoom {zoom}. Import size: {width}x{height} cm.",
    "dialog.mapTooLargeWarning": "Warning: map is too large ({width}x{height} cm). Maximum is {max} cm per side. Zoom in to reduce size.",
    "dialog.cropInfo": "Crop: {pxWidth}x{pxHeight} px -> {width}x{height} cm",

    "prompt.noteText": "Enter note text:",
    "prompt.newPlannerName": "Enter planner name:",

    "error.unableReadImageData": "Unable to read image data.",
    "error.failedReadSelectedFile": "Failed to read the selected file.",
    "error.failedDecodeImage": "Failed to decode the selected image.",
    "error.invalidPlannerFileFormat": "Invalid planner file format.",
    "error.failedLoadGoogleMapsApi": "Failed to load Google Maps API.",
    "error.googleMapsApiNoMapSupport": "Google Maps API loaded without map support.",
    "error.unableLoadSatelliteImage": "Unable to load the satellite image. Make sure the 'Maps Static API' service is enabled for this API key in Google Cloud Console (console.cloud.google.com → APIs & Services).",

    "label.dragToRotate": "Drag to rotate",
    "hint.objectPlaced": "{label} placed. Drag it to move.",
    "hint.undoObjectRemoved": "Undo: {label} removed.",
    "hint.undoRotationRestored": "Undo: rotation restored.",
    "hint.rotatedTo": "Rotated {type} to {degrees} degrees.",
    "hint.undoMoveRestored": "Undo: move restored.",
  },
  ja: {
    "app.title": "ルームプランナー",
    "app.subtitle": "左側パネルから体操器具を部屋にドラッグしてください。オブジェクトをクリックすると移動・回転・削除できます。",
    "lang.label": "言語",
    "lang.english": "英語",
    "lang.japanese": "日本語",

    "tab.equipment": "器具",
    "tab.actions": "操作",
    "tab.map": "マップ",

    "btn.addEquipment": "器具を追加",
    "btn.deleteSelected": "選択を削除",
    "btn.undo": "元に戻す (Ctrl+Z)",
    "btn.savePlanner": "プランを保存",
    "btn.clearRoom": "部屋をクリア",
    "btn.resetBackground": "背景表示をリセット",
    "btn.showGrid": "グリッドを表示",
    "btn.hideGrid": "グリッドを非表示",
    "btn.mouseModeDrag": "マウスモード: ドラッグ",
    "btn.mouseModeSelect": "マウスモード: 選択",
    "btn.addNote": "メモを追加",
    "btn.suggestPlanner": "プランを提案",
    "btn.measureDistance": "距離を計測",
    "btn.alignLeft": "左揃え",
    "btn.alignCenter": "中央揃え",
    "btn.rotateCW": "右に90°回転",
    "btn.rotateCCW": "左に90°回転",
    "btn.copy": "コピー",
    "btn.paste": "貼り付け",
    "btn.newMap": "新しいマップ",
    "btn.importGoogleMap": "Googleマップを読み込み",
    "btn.newPlanner": "新しいプランナー",
    "btn.deletePlanner": "プランナーを削除",
    "btn.drawYellowLine": "黄色の線を描画",
    "btn.drawYellowFreehand": "フリーハンドで描画",
    "btn.removeYellowArea": "黄色エリアを削除",
    "btn.deleteCustomMap": "カスタムマップを削除",
    "btn.deleteCustomEquipment": "カスタム器具を削除",
    "btn.cancel": "キャンセル",
    "btn.createMap": "マップを作成",
    "btn.addItem": "項目を追加",
    "btn.importFile": "ファイルを読み込み",
    "btn.resetCrop": "切り抜きをリセット",

    "label.background": "背景",
    "label.backgroundZoom": "背景ズーム",
    "label.mapName": "マップ名",
    "label.widthCm": "幅 (cm)",
    "label.heightCm": "高さ (cm)",
    "label.color": "色",
    "label.texture": "テクスチャ",
    "label.name": "名前",
    "label.item": "項目",
    "label.lengthCm": "長さ (cm)",
    "label.note": "メモ",
    "label.countBars": "段違い平行棒の数",
    "label.countBeam": "平均台の数",
    "label.countBoxVault": "跳び箱の数",
    "label.countFloor": "床の数",
    "label.countVault": "跳馬の数",
    "label.googleMapsLink": "Googleマップのリンク",
    "label.planner": "プランナー",
    "title.newMap": "新しいマップを作成",
    "title.newEquipment": "器具項目を追加",
    "title.newNote": "メモを追加",
    "title.suggestPlanner": "プランを提案",
    "title.importGoogleMap": "Googleマップ衛星画像を読み込み",
    "placeholder.newMapName": "練習ルーム",
    "placeholder.newEquipmentName": "カスタム平均台",
    "placeholder.googleMapsLink": "https://maps.google.com/...",
    "placeholder.googleMapName": "読み込み済み衛星マップ",
    "placeholder.noteText": "メモを入力してください...",

    "option.gymFloor": "体育館（2コート）",
    "option.indoorGym": "室内体育館",
    "option.concrete": "コンクリート",
    "option.woodDeck": "ウッドデッキ",
    "option.stoneBrick": "石 / レンガ",
    "option.grass": "芝生",
    "option.dirtGravel": "土 / 砂利",
    "option.asphalt": "アスファルト",
    "option.defaultPlanner": "デフォルトプランナー",
    "equipment.bars": "段違い平行棒",
    "equipment.beam": "平均台",
    "equipment.boxVault": "跳び箱",
    "equipment.floor": "床",
    "equipment.springboard": "踏切板",
    "equipment.vault": "跳馬",
    "equipment.mat": "マット",

    "hint.default": "オブジェクトを部屋の中にドロップしてください",
    "hint.dragging": "{item}をドラッグ中。部屋にドロップしてください。",
    "hint.backgroundViewReset": "背景表示をリセットしました。",
    "hint.equipmentDialogUnavailable": "器具ダイアログを使用できません。",
    "hint.addedEquipment": "器具を追加しました: {name}。器具タブからドラッグしてください。",
    "hint.unableAddEquipment": "器具を追加できませんでした。",
    "hint.customEquipmentUpdated": "カスタム器具を更新しました。",
    "hint.unableUpdateCustomEquipment": "カスタム器具を更新できませんでした。",
    "hint.selectCustomEquipmentDelete": "削除するカスタム器具を選択してください。",
    "hint.customEquipmentDeleteCanceled": "カスタム器具の削除をキャンセルしました。",
    "hint.customEquipmentDeleted": "カスタム器具を削除しました。",
    "hint.customEquipmentInUseCannotDelete": "このカスタム器具は {count} 個のマップで使用されているため削除できません。先にそれらのマップから削除してください。",
    "hint.unableDeleteCustomEquipment": "カスタム器具を削除できませんでした。",
    "hint.undoObjectRestored": "元に戻す: オブジェクトを復元しました。",
    "hint.objectRemoved": "オブジェクトを削除しました。",
    "hint.selectObjectDelete": "削除するオブジェクトを選択してください。",
    "hint.undoRoomRestored": "元に戻す: 部屋を復元しました。",
    "hint.roomCleared": "部屋をクリアしました。",
    "hint.backgroundUpdated": "背景を更新しました。",
    "hint.newPlannerCreated": "プランナーを作成しました: {planner}。",
    "hint.newPlannerBlankLoaded": "プランナーを読み込みました: {planner}（空）。",
    "hint.plannerDeleteCanceled": "プランナーの削除をキャンセルしました。",
    "hint.plannerDeleted": "プランナーを削除しました: {planner}。",
    "hint.unableDeletePlanner": "プランナーを削除できませんでした。",
    "hint.dragModeEnabled": "ドラッグモードを有効化しました。",
    "hint.selectModeEnabled": "選択モードを有効化しました。ドラッグして複数オブジェクトを選択できます。",
    "hint.selectionCaptured": "{count} 個のオブジェクトを選択しました。",
    "hint.noteAdded": "メモを追加しました。",
    "hint.noteUpdated": "メモを更新しました。",
    "hint.noteCanceled": "メモ追加をキャンセルしました。",
    "hint.noteEmpty": "メモのテキストは空にできません。",
    "hint.noteDialogUnavailable": "メモダイアログを使用できません。",
    "hint.suggestPlannerDialogUnavailable": "プラン提案ダイアログを使用できません。",
    "hint.suggestPlannerNoItems": "少なくとも1つ以上の器具数を入力してください。",
    "hint.suggestPlannerApplied": "提案プランを適用しました（{placed} セット）。",
    "hint.suggestPlannerAppliedPartial": "提案プランを適用しました（{placed} セット）。{skipped} セットは配置できませんでした。",
    "hint.measureToolDisabled": "計測ツールを無効化しました。",
    "hint.measureFirstPoint": "計測ツールを有効化しました。1点目をクリックしてください。",
    "hint.measureSecondPoint": "2点目をクリックして計測を完了してください。",
    "hint.measureTooShort": "点が近すぎるため計測をキャンセルしました。",
    "hint.measureAdded": "計測を追加しました: {meters} m。",
    "hint.measureAreaToolDisabled": "面積計測ツールを無効化しました。",
    "hint.measureAreaPoint": "{n} 点目（全4点）をクリックしてください。",
    "hint.measureAreaAdded": "面積計測を追加しました: {sqm} m²。",
    "hint.selectAtLeastTwoAlign": "整列するには2つ以上のオブジェクトを選択してください。",
    "hint.alignedLeft": "選択オブジェクトを左端に揃えました。",
    "hint.rotatedCW": "選択を時計回りに90°回転しました。",
    "hint.rotatedCCW": "選択を反時計回りに90°回転しました。",
    "hint.selectAtLeastOneRotate": "回転するには少なくとも1つのオブジェクトを選択してください。",
    "hint.alignedCenter": "選択オブジェクトを中央に揃えました。",
    "hint.undoAnnotationRemoved": "元に戻す: 注釈を削除しました。",
    "hint.nothingToCopy": "コピーするには1つ以上のオブジェクトを選択してください。",
    "hint.nothingToPaste": "貼り付ける内容がありません。先に器具をコピーしてください。",
    "hint.copiedSelection": "{count} 個の選択オブジェクトをコピーしました。",
    "hint.pastedSelection": "{count} 個のオブジェクトを貼り付けました。",
    "hint.undoPastedRemoved": "元に戻す: 貼り付けたオブジェクトを削除しました。",

    "hint.plannerSavedDisk": "プランをディスクに保存しました。",
    "hint.unableSaveDisk": "プランをディスクに保存できませんでした。",
    "hint.plannerRestoredServer": "サーバー保存からプランを復元しました。",
    "hint.plannerRestoredLocal": "ローカル保存からプランを復元しました。",
    "hint.plannerFileSaved": "プランファイルを保存しました。",
    "hint.plannerFileLoaded": "プランファイルを読み込みました。",

    "confirm.deleteCustomEquipment": "{name}を削除しますか？この操作は元に戻せません。",
    "confirm.deleteCustomMap": "{name}を削除しますか？この操作は元に戻せません。",
    "confirm.deletePlanner": "プランナー {planner} を削除しますか？この操作は元に戻せません。",

    "hint.satelliteDisplayFailed": "衛星画像を表示できませんでした。Google Cloud ConsoleでこのAPIキーの「Maps Static API」が有効か確認してください。",
    "hint.selectImportedMapForDraw": "黄色エリアを描画するには、読み込み済みのカスタムマップを選択してください。",
    "hint.selectCustomMapForDraw": "黄色エリアを描画するには、カスタムマップを選択してください。",
    "hint.drawLineModeEnabled": "直線描画モードを有効化しました。マップ上をドラッグして黄色の線を配置してください。",
    "hint.drawFreehandModeEnabled": "フリーハンド描画モードを有効化しました。マップ上をドラッグして黄色の線を描画してください。",
    "hint.drawModeDisabled": "描画モードを無効化しました。",
    "hint.yellowAreasRemoved": "このマップの黄色エリアを削除しました。",
    "hint.noCustomMapDelete": "削除するカスタムマップがありません。",
    "hint.customMapDeleted": "カスタムマップを削除しました。",
    "hint.selectCustomMapEdit": "編集するカスタムマップを選択してください。",
    "hint.customMapNameEmpty": "カスタムマップ名は空にできません。",
    "hint.customMapSizePositive": "カスタムマップのサイズは 0 cm より大きくしてください。",
    "hint.importedDimsLocked": "読み込み済みマップは幅と高さを変更できません。",
    "hint.invalidCustomMapTexture": "カスタムマップのテクスチャが無効です。",
    "hint.customMapUpdated": "カスタムマップを更新しました。",
    "hint.newMapDialogUnavailable": "新規マップダイアログを使用できません。",
    "hint.enterMapName": "マップ名を入力してください。",
    "hint.mapSizePositive": "マップサイズは 0 cm より大きくしてください。",
    "hint.invalidTextureChoice": "テクスチャの選択が無効です。",
    "hint.customMapCreated": "カスタムマップを作成しました: {name}（{width}x{height} cm, {texture}）。",
    "hint.googleImportDialogUnavailable": "Googleマップ読み込みダイアログを使用できません。",
    "hint.mapDimensionsTryZoom": "マップサイズは 0 cm より大きくしてください。別のズームレベルを試してください。",
    "hint.importedSatelliteMap": "衛星マップを読み込みました: {name}（{width}x{height} cm）。",
    "hint.pasteGoogleLinkFirst": "先にGoogleマップのリンクを貼り付けてください。",
    "hint.provideMapName": "マップ名を入力してください。",
    "hint.selectedImageFile": "選択した画像ファイル: {name}",
    "hint.pasteGoogleLink": "Googleマップのリンクを貼り付けてください。",
    "hint.customMapDeleteCanceled": "カスタムマップの削除をキャンセルしました。",
    "hint.invalidGoogleMapsLink": "Googleマップのリンクが無効です。",
    "hint.importFileBeforeCreate": "マップ作成前に「ファイルを読み込み」で画像を選択してください。",
    "hint.drawModeEnabledImage": "描画モードを有効化しました: 画像上をフリーハンドでドラッグして黄色線を描画できます。",
    "hint.cropDragImage": "画像上をドラッグして切り抜きます。マップ寸法は自動更新されます。",
    "hint.unableLoadGooglePreview": "Googleマップのプレビューを読み込めませんでした。",

    "error.unsupportedMapTexture": "サポートされていないマップテクスチャです。",
    "error.mapDimensionsPositive": "マップサイズは 0 cm より大きくしてください。",
    "error.customImageInvalid": "カスタム画像マップのデータが無効です。",
    "error.googleMapsLinkRequired": "Googleマップのリンクが必要です。",
    "error.unableDetectLatZoom": "リンクから緯度/ズームを検出できません。GoogleマップのURL（例: ブラウザのアドレスバーのリンク）を使用してください。",
    "error.googleMapPreviewUnavailable": "Googleマップのプレビュー領域を使用できません。",

    "dialog.pasteValidGoogleUrl": "有効なGoogleマップURLを貼り付けてプレビューを読み込んでください。",
    "dialog.previewReady": "プレビューの準備ができました。リンクを自動更新するにはマップをドラッグまたはズームしてください。",
    "dialog.useSnippingToolOnPreview": "プレビューの準備ができました。上のマップ画像をスニッピングツールで切り取り、「ファイルを読み込み」をクリックしてください。",
    "dialog.noFileSelected": "ファイルが選択されていません。",
    "dialog.selectedFile": "選択済み: {name}",
    "dialog.loadingImageFile": "画像ファイルを読み込み中...",
    "dialog.imageFileLoaded": "画像ファイルを読み込みました。「マップを作成」を押して取り込みます。",
    "dialog.importedSatelliteMapShort": "衛星マップを読み込みました: {name}。",
    "dialog.detectedImportSize": "検出: 緯度 {latitude}、経度 {longitude}、ズーム {zoom}。取り込みサイズ: {width}x{height} cm。",
    "dialog.mapTooLargeWarning": "警告: マップが大きすぎます（{width}x{height} cm）。1辺あたりの最大は {max} cm です。サイズを小さくするにはズームインしてください。",
    "dialog.cropInfo": "切り抜き: {pxWidth}x{pxHeight} px -> {width}x{height} cm",

    "prompt.noteText": "メモのテキストを入力してください:",
    "prompt.newPlannerName": "プランナー名を入力してください:",

    "error.unableReadImageData": "画像データを読み取れません。",
    "error.failedReadSelectedFile": "選択したファイルを読み取れませんでした。",
    "error.failedDecodeImage": "選択した画像をデコードできませんでした。",
    "error.invalidPlannerFileFormat": "プランファイルの形式が無効です。",
    "error.failedLoadGoogleMapsApi": "Google Maps APIの読み込みに失敗しました。",
    "error.googleMapsApiNoMapSupport": "Google Maps APIが読み込まれましたが、マップ機能がありません。",
    "error.unableLoadSatelliteImage": "衛星画像を読み込めません。Google Cloud ConsoleでこのAPIキーの「Maps Static API」サービスが有効になっているか確認してください（console.cloud.google.com → API とサービス）。",

    "label.dragToRotate": "ドラッグして回転",
    "hint.objectPlaced": "{label}を配置しました。ドラッグして移動できます。",
    "hint.undoObjectRemoved": "元に戻す: {label}を削除しました。",
    "hint.undoRotationRestored": "元に戻す: 回転を元に戻しました。",
    "hint.rotatedTo": "{type}を{degrees}度に回転しました。",
    "hint.undoMoveRestored": "元に戻す: 移動を元に戻しました。",
  },
};

function interpolate(text, params) {
  if (!params) return text;
  return String(text).replace(/\{(\w+)\}/g, (_, key) => (params[key] == null ? "" : String(params[key])));
}

function getInitialLanguage() {
  const stored = localStorage.getItem(I18N_STORAGE_KEY);
  if (stored && I18N[stored]) return stored;
  const browserLang = (navigator.language || "en").toLowerCase();
  return browserLang.startsWith("ja") ? "ja" : "en";
}

let currentLanguage = getInitialLanguage();

function t(key, params) {
  const langDict = I18N[currentLanguage] || I18N.en;
  const fallback = I18N.en[key] || key;
  return interpolate(langDict[key] || fallback, params);
}

function setText(selector, key) {
  const el = document.querySelector(selector);
  if (el) el.textContent = t(key);
}

function setLabel(forId, key) {
  const el = document.querySelector(`label[for="${forId}"]`);
  if (el) el.textContent = t(key);
}

function setBackgroundZoomLabel() {
  const el = document.querySelector('label[for="backgroundZoom"]');
  if (!el) return;

  const valueEl = document.getElementById("backgroundZoomValue");
  const valueText = valueEl ? valueEl.textContent : "100%";
  el.textContent = `${t("label.backgroundZoom")} `;

  const span = document.createElement("span");
  span.id = "backgroundZoomValue";
  span.textContent = valueText;
  el.appendChild(span);
}

function setOption(selectId, value, key) {
  const el = document.querySelector(`#${selectId} option[value="${value}"]`);
  if (el) el.textContent = t(key);
}

function applyI18n() {
  document.documentElement.lang = currentLanguage;

  setText(".app-header h1", "app.title");
  setText(".app-header p", "app.subtitle");
  setText("#equipmentTabBtn", "tab.equipment");
  setText("#actionsTabBtn", "tab.actions");
  setText("#mapTabBtn", "tab.map");

  setText("#addEquipmentBtn", "btn.addEquipment");
  setText("#addNoteBtn", "btn.addNote");
  setText("#suggestPlannerBtn", "btn.suggestPlanner");
  setText("#measureToolBtn", "btn.measureDistance");
  setText("#measureAreaBtn", "btn.measureArea");
  setText("#alignLeftBtn", "btn.alignLeft");
  setText("#alignCenterBtn", "btn.alignCenter");
  setText("#rotateCWBtn", "btn.rotateCW");
  setText("#rotateCCWBtn", "btn.rotateCCW");
  setText("#copySelectionBtn", "btn.copy");
  setText("#pasteSelectionBtn", "btn.paste");
  setText("#deleteBtn", "btn.deleteSelected");
  setText("#undoBtn", "btn.undo");
  setText("#savePlannerBtn", "btn.savePlanner");
  setText("#clearBtn", "btn.clearRoom");
  setText("#resetBackgroundBtn", "btn.resetBackground");
  if (typeof syncToggleGridBtn === "function") syncToggleGridBtn();
  if (typeof syncMouseModeBtn === "function") syncMouseModeBtn();
  setText("#newMapBtn", "btn.newMap");
  setText("#importGoogleMapBtn", "btn.importGoogleMap");
  setText("#newPlannerBtn", "btn.newPlanner");
  setText("#deletePlannerBtn", "btn.deletePlanner");
  setText("#customMapDrawLineBtn", "btn.drawYellowLine");
  setText("#customMapDrawFreehandBtn", "btn.drawYellowFreehand");
  setText("#customMapClearAreaBtn", "btn.removeYellowArea");
  setText("#deleteCustomMapBtn", "btn.deleteCustomMap");
  setText("#deleteCustomEquipmentBtn", "btn.deleteCustomEquipment");
  setText("#newMapDialogTitle", "title.newMap");
  setText("#newEquipmentDialogTitle", "title.newEquipment");
  setText("#newNoteDialogTitle", "title.newNote");
  setText("#suggestPlannerDialogTitle", "title.suggestPlanner");
  setText("#importGoogleMapDialogTitle", "title.importGoogleMap");
  setText("#newMapCancelBtn", "btn.cancel");
  setText("#newMapCreateBtn", "btn.createMap");
  setText("#newEquipmentCancelBtn", "btn.cancel");
  setText("#newEquipmentCreateBtn", "btn.addItem");
  setText("#newNoteCancelBtn", "btn.cancel");
  setText("#newNoteCreateBtn", "btn.addNote");
  setText("#suggestPlannerCancelBtn", "btn.cancel");
  setText("#suggestPlannerCreateBtn", "btn.suggestPlanner");
  setText("#importGoogleMapFileBtn", "btn.importFile");
  setText("#googleMapResetCropBtn", "btn.resetCrop");
  setText("#importGoogleMapCancelBtn", "btn.cancel");
  setText("#importGoogleMapCreateBtn", "btn.createMap");

  setLabel("backgroundSelect", "label.background");
  setLabel("plannerSelect", "label.planner");
  setBackgroundZoomLabel();
  setLabel("customMapNameInput", "label.name");
  setLabel("customMapWidthInput", "label.widthCm");
  setLabel("customMapHeightInput", "label.heightCm");
  setLabel("customMapTextureSelect", "label.texture");
  setLabel("customEquipmentSelect", "label.item");
  setLabel("customEquipmentNameInput", "label.name");
  setLabel("customEquipmentLengthInput", "label.lengthCm");
  setLabel("customEquipmentWidthInput", "label.widthCm");
  setLabel("customEquipmentColorInput", "label.color");
  setLabel("newMapNameInput", "label.mapName");
  setLabel("newMapWidthInput", "label.widthCm");
  setLabel("newMapHeightInput", "label.heightCm");
  setLabel("newMapTextureSelect", "label.texture");
  setLabel("newEquipmentNameInput", "label.name");
  setLabel("newEquipmentLengthInput", "label.lengthCm");
  setLabel("newEquipmentWidthInput", "label.widthCm");
  setLabel("newEquipmentColorInput", "label.color");
  setLabel("newNoteTextInput", "label.note");
  setLabel("newNoteColorInput", "label.color");
  setLabel("suggestBarsCountInput", "label.countBars");
  setLabel("suggestBeamCountInput", "label.countBeam");
  setLabel("suggestBoxVaultCountInput", "label.countBoxVault");
  setLabel("suggestFloorCountInput", "label.countFloor");
  setLabel("suggestVaultCountInput", "label.countVault");
  setLabel("googleMapLinkInput", "label.googleMapsLink");
  setLabel("googleMapNameInput", "label.mapName");
  const newMapNameInput = document.getElementById("newMapNameInput");
  if (newMapNameInput) newMapNameInput.placeholder = t("placeholder.newMapName");
  const newEquipmentNameInput = document.getElementById("newEquipmentNameInput");
  if (newEquipmentNameInput) newEquipmentNameInput.placeholder = t("placeholder.newEquipmentName");
  const googleMapLinkInput = document.getElementById("googleMapLinkInput");
  if (googleMapLinkInput) googleMapLinkInput.placeholder = t("placeholder.googleMapsLink");
  const googleMapNameInput = document.getElementById("googleMapNameInput");
  if (googleMapNameInput) googleMapNameInput.placeholder = t("placeholder.googleMapName");
  const newNoteTextInput = document.getElementById("newNoteTextInput");
  if (newNoteTextInput) newNoteTextInput.placeholder = t("placeholder.noteText");

  setOption("backgroundSelect", "assets/gym-floor-topdown-4000x7000cm.svg", "option.gymFloor");
  setOption("customMapTextureSelect", "indoorGym", "option.indoorGym");
  setOption("customMapTextureSelect", "concrete", "option.concrete");
  setOption("customMapTextureSelect", "woodDeck", "option.woodDeck");
  setOption("customMapTextureSelect", "stoneBrick", "option.stoneBrick");
  setOption("customMapTextureSelect", "grass", "option.grass");
  setOption("customMapTextureSelect", "dirtGravel", "option.dirtGravel");
  setOption("customMapTextureSelect", "asphalt", "option.asphalt");
  setOption("newMapTextureSelect", "indoorGym", "option.indoorGym");
  setOption("newMapTextureSelect", "concrete", "option.concrete");
  setOption("newMapTextureSelect", "woodDeck", "option.woodDeck");
  setOption("newMapTextureSelect", "stoneBrick", "option.stoneBrick");
  setOption("newMapTextureSelect", "grass", "option.grass");
  setOption("newMapTextureSelect", "dirtGravel", "option.dirtGravel");
  setOption("newMapTextureSelect", "asphalt", "option.asphalt");
  setOption("plannerSelect", "default", "option.defaultPlanner");

  setText('.palette-item[data-type="bars"]', "equipment.bars");
  setText('.palette-item[data-type="beam"]', "equipment.beam");
  setText('.palette-item[data-type="boxVault"]', "equipment.boxVault");
  setText('.palette-item[data-type="floor"]', "equipment.floor");
  setText('.palette-item[data-type="springboard"]', "equipment.springboard");
  setText('.palette-item[data-type="vault"]', "equipment.vault");
  setText('.palette-item[data-type="mat"]', "equipment.mat");

  // Refresh labels on already-placed room objects
  document.querySelectorAll(".room-object[data-type]").forEach((obj) => {
    const type = obj.dataset.type;
    if (window.objectCatalog && window.objectCatalog[type]) {
      const newLabel = window.objectCatalog[type].label;
      for (const child of obj.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          child.nodeValue = newLabel;
          break;
        }
      }
    }
  });

  if (window.objectCatalog) {
    const labelKeys = {
      bars: "equipment.bars",
      beam: "equipment.beam",
      boxVault: "equipment.boxVault",
      floor: "equipment.floor",
      springboard: "equipment.springboard",
      vault: "equipment.vault",
      mat: "equipment.mat",
    };
    Object.entries(labelKeys).forEach(([type, key]) => {
      if (window.objectCatalog[type]) {
        window.objectCatalog[type].label = t(key);
      }
    });
  }

  const languageLabel = document.getElementById("languageLabel");
  if (languageLabel) languageLabel.textContent = t("lang.label");

  const select = document.getElementById("languageSelect");
  if (select) {
    const enOption = select.querySelector('option[value="en"]');
    const jaOption = select.querySelector('option[value="ja"]');
    if (enOption) enOption.textContent = t("lang.english");
    if (jaOption) jaOption.textContent = t("lang.japanese");
    select.value = currentLanguage;
  }

  if (typeof hint !== "undefined" && hint && hint.textContent.trim() === "") {
    hint.textContent = t("hint.default");
  }
}

function setLanguage(language) {
  if (!I18N[language]) return;
  currentLanguage = language;
  localStorage.setItem(I18N_STORAGE_KEY, language);
  applyI18n();
}

window.t = t;
window.setLanguage = setLanguage;
window.getLanguage = () => currentLanguage;
window.applyI18n = applyI18n;

// Apply after DOM is available; scripts are loaded at end of body.
applyI18n();
window.addEventListener("load", applyI18n);

const languageSelect = document.getElementById("languageSelect");
if (languageSelect) {
  languageSelect.value = currentLanguage;
  languageSelect.addEventListener("change", (event) => {
    setLanguage(event.target.value);
  });
}
