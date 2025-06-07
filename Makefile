.PHONY: package
package:
	@echo "Packaging dist/mouse-gesture.zip..."
	@rm -rf dist && mkdir dist
	@zip -r dist/mouse-gesture.zip . -x ".git/*" "dist/*" "store/*"
	@echo "✅ Done: dist/mouse-gesture.zip created."
